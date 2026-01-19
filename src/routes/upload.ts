/**
 * Upload Routes for MedAIx
 * Handles image upload operations with automatic user creation
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { prisma } from '../server';
import { analyzeImage } from '../services/inference';
import { asyncHandler, createError } from '../middleware/errorHandler';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common image and medical file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/tiff',
      'application/dicom',
      'application/octet-stream' // for DICOM files
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and DICOM files are allowed.'));
    }
  },
});

const router = express.Router();

/**
 * Ensure a default user exists in the database
 * Creates a demo user if none exists
 */
async function ensureDefaultUser(): Promise<string> {
  // Check if any user exists
  const existingUser = await prisma.user.findFirst({
    select: { id: true }
  });

  if (existingUser) {
    return existingUser.id;
  }

  // Create a default demo user
  const defaultUser = await prisma.user.create({
    data: {
      id: 'demo-user-001',
      email: 'demo@medaix.local',
      name: 'Demo User',
      role: 'researcher',
      institution: 'MedAIx Demo Lab',
      department: 'Research',
      specialization: ['Medical Imaging'],
      isVerified: true,
      preferences: {},
      memberSince: new Date(),
      lastActive: new Date()
    }
  });

  return defaultUser.id;
}

/**
 * Get or create a user by ID, or use default user
 */
async function getOrCreateUser(userId?: string): Promise<string> {
  if (!userId) {
    // No userId provided, use default user
    return ensureDefaultUser();
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (existingUser) {
    return existingUser.id;
  }

  // User doesn't exist, create a new one with the provided ID
  const newUser = await prisma.user.create({
    data: {
      id: userId,
      email: `user-${userId}@medaix.local`,
      name: `User ${userId}`,
      role: 'researcher',
      preferences: {},
      memberSince: new Date(),
      lastActive: new Date()
    }
  });

  return newUser.id;
}

// @route   POST /api/upload/image
// @desc    Upload image for analysis
// @access  Public (for demo purposes)
router.post('/image', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  // Store file reference to avoid TypeScript undefined errors in closures
  const uploadedFile = req.file;

  const { projectId, userId, description, tags } = req.body;

  // Get or create user (auto-creation to avoid FK errors)
  const effectiveUserId = await getOrCreateUser(userId);

  // Generate unique ID for the image
  const imageId = uuidv4();

  // Process the image
  const processedImage = await sharp(uploadedFile.buffer)
    .metadata()
    .catch(() => ({ width: null, height: null, format: null }));

  // Save file to local storage (in production, use cloud storage)
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${imageId}_${uploadedFile.originalname}`;
  const filePath = path.join(uploadsDir, fileName);

  // Write file to disk
  await fs.promises.writeFile(filePath, uploadedFile.buffer);

  // Determine image type
  const isDicom = uploadedFile.mimetype.includes('dicom') ||
                  uploadedFile.originalname.toLowerCase().endsWith('.dcm') ||
                  uploadedFile.originalname.toLowerCase().endsWith('.dicom');

  // Create image record in database
  const imageRecord = await prisma.uploadedImage.create({
    data: {
      id: imageId,
      projectId: projectId || null,
      uploadedById: effectiveUserId,
      fileName: fileName,
      originalFileName: uploadedFile.originalname || null,
      filePath: filePath,
      fileSize: uploadedFile.size ? BigInt(uploadedFile.size) : null,
      mimeType: uploadedFile.mimetype,
      width: processedImage.width || null,
      height: processedImage.height || null,
      imageType: isDicom ? 'dicom' : 'standard',
      hasMetadata: false,
      analysisStatus: 'pending',
      tags: tags ? JSON.parse(tags) : [],
      description: description || null,
      consentObtained: true,
      dataClassification: 'restricted',
      anonymized: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });


  setTimeout(async () => {
    try {
      await analyzeImage(imageId, uploadedFile.buffer);
    } catch (error) {
      console.error(`[Upload] Analysis failed for image ${imageId}:`, error);
    }
  }, 100); // Small delay to ensure DB transaction completes

  // Schedule auto-deletion after 60 seconds
  setTimeout(async () => {
    try {
      // Check if image has been analyzed
      const image = await prisma.uploadedImage.findUnique({
        where: { id: imageId },
        select: { analysisStatus: true, filePath: true }
      });

      if (image && image.analysisStatus === 'pending') {
        // Delete file and record
        if (fs.existsSync(image.filePath)) {
          fs.unlinkSync(image.filePath);
        }

        await prisma.uploadedImage.delete({
          where: { id: imageId }
        });
      }
    } catch (error) {
      console.error(`[Upload] Failed to auto-delete image ${imageId}:`, error);
    }
  }, 60000); // 60 seconds

  res.status(201).json({
    success: true,
    image: {
      id: imageRecord.id,
      fileName: imageRecord.fileName,
      originalFileName: imageRecord.originalFileName,
      fileSize: imageRecord.fileSize?.toString(),
      mimeType: imageRecord.mimeType,
      imageType: imageRecord.imageType,
      analysisStatus: imageRecord.analysisStatus,
      createdAt: imageRecord.createdAt.toISOString(),
      updatedAt: imageRecord.updatedAt.toISOString()
    },
    message: 'Image uploaded successfully. Analysis will begin shortly.'
  });
}));

// @route   GET /api/upload/images/:userId
// @desc    Get all images for a user
// @access  Private
router.get('/images/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { projectId, page = '1', limit = '20' } = req.query;

  // Check if user exists, if not create one
  await getOrCreateUser(userId);

  // Query images for this user
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where = {
    uploadedById: userId,
    ...(projectId ? { projectId: projectId as string } : {})
  };

  const [images, total] = await Promise.all([
    prisma.uploadedImage.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        fileName: true,
        originalFileName: true,
        fileSize: true,
        mimeType: true,
        imageType: true,
        width: true,
        height: true,
        analysisStatus: true,
        tags: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.uploadedImage.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      images: images.map(img => ({
        ...img,
        fileSize: img.fileSize?.toString()
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    }
  });
}));

// @route   GET /api/upload/image/:id
// @desc    Get specific image by ID
// @access  Private
router.get('/image/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const image = await prisma.uploadedImage.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      uploadedById: true,
      fileName: true,
      originalFileName: true,
      filePath: true,
      fileSize: true,
      mimeType: true,
      imageType: true,
      width: true,
      height: true,
      analysisStatus: true,
      tags: true,
      description: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!image) {
    throw createError('Image not found', 404);
  }

  res.json({
    success: true,
    data: {
      image: {
        ...image,
        fileSize: image.fileSize?.toString()
      }
    }
  });
}));

// @route   DELETE /api/upload/image/:id
// @desc    Delete image
// @access  Private
router.delete('/image/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Find the image
  const image = await prisma.uploadedImage.findUnique({
    where: { id },
    select: { filePath: true, uploadedById: true }
  });

  if (!image) {
    throw createError('Image not found', 404);
  }

  // Delete file from disk
  if (fs.existsSync(image.filePath)) {
    fs.unlinkSync(image.filePath);
  }

  // Delete from database
  await prisma.uploadedImage.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Image deleted successfully'
  });
}));

// @route   POST /api/upload/batch
// @desc    Upload multiple images at once
// @access  Private
router.post('/batch', upload.array('images', 10), asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw createError('No files uploaded', 400);
  }

  const { userId, projectId } = req.body;
  const effectiveUserId = await getOrCreateUser(userId);

  const uploadedImages = [];

  for (const file of req.files) {
    const imageId = uuidv4();
    const fileName = `${imageId}_${file.originalname}`;
    
    // Process each image
    const processedImage = await sharp(file.buffer)
      .metadata()
      .catch(() => ({ width: null, height: null }));

    const imageRecord = await prisma.uploadedImage.create({
      data: {
        id: imageId,
        projectId: projectId || null,
        uploadedById: effectiveUserId,
        fileName: fileName,
        originalFileName: file.originalname,
        filePath: `/uploads/${fileName}`,
        fileSize: file.size ? BigInt(file.size) : null,
        mimeType: file.mimetype,
        width: processedImage.width || null,
        height: processedImage.height || null,
        imageType: file.mimetype.includes('dicom') ? 'dicom' : 'standard',
        analysisStatus: 'pending',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    uploadedImages.push({
      id: imageRecord.id,
      fileName: imageRecord.fileName,
      originalFileName: imageRecord.originalFileName,
      fileSize: imageRecord.fileSize?.toString(),
      mimeType: imageRecord.mimeType,
      imageType: imageRecord.imageType,
      analysisStatus: imageRecord.analysisStatus,
      createdAt: imageRecord.createdAt.toISOString()
    });
  }

  res.status(201).json({
    success: true,
    data: {
      images: uploadedImages,
      count: uploadedImages.length,
      message: `${uploadedImages.length} images uploaded successfully`
    }
  });
}));

export default router;

