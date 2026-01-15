"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prismaClient_1 = require("../prismaClient");
const inference_1 = require("../services/inference");
const errorHandler_1 = require("../middleware/errorHandler");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/tiff',
            'application/dicom',
            'application/octet-stream'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images and DICOM files are allowed.'));
        }
    },
});
const router = express_1.default.Router();
async function getOrCreateUser(userId) {
    const effectiveUserId = userId || '1';
    const user = await prismaClient_1.prisma.user.upsert({
        where: { id: effectiveUserId },
        create: {
            id: effectiveUserId,
            email: effectiveUserId === '1' ? 'demo@medaix.local' : `user-${effectiveUserId}@medaix.local`,
            name: effectiveUserId === '1' ? 'Demo User' : `User ${effectiveUserId}`,
            role: 'researcher',
            preferences: {},
            memberSince: new Date(),
            lastActive: new Date(),
        },
        update: {
            lastActive: new Date(),
        },
    });
    return user.id;
}
router.post('/image', upload.single('image'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw (0, errorHandler_1.createError)('No file uploaded', 400);
    }
    const uploadedFile = req.file;
    const { projectId, userId, description, tags } = req.body;
    const effectiveUserId = await getOrCreateUser(userId);
    const imageId = (0, uuid_1.v4)();
    const processedImage = await (0, sharp_1.default)(uploadedFile.buffer)
        .metadata()
        .catch(() => ({ width: null, height: null, format: null }));
    const uploadsDir = path_1.default.join(__dirname, '../../uploads');
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    const fileName = `${imageId}_${uploadedFile.originalname}`;
    const filePath = path_1.default.join(uploadsDir, fileName);
    await fs_1.default.promises.writeFile(filePath, uploadedFile.buffer);
    const isDicom = uploadedFile.mimetype.includes('dicom') ||
        uploadedFile.originalname.toLowerCase().endsWith('.dcm') ||
        uploadedFile.originalname.toLowerCase().endsWith('.dicom');
    const imageRecord = await prismaClient_1.prisma.uploadedImage.create({
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
            await (0, inference_1.analyzeImage)(imageId, uploadedFile.buffer);
            console.log(`[Upload] Analysis completed for image ${imageId}`);
        }
        catch (error) {
            console.error(`[Upload] Analysis failed for image ${imageId}:`, error);
        }
    }, 100);
    setTimeout(async () => {
        try {
            const image = await prismaClient_1.prisma.uploadedImage.findUnique({
                where: { id: imageId },
                select: { analysisStatus: true, filePath: true }
            });
            if (image && image.analysisStatus === 'pending') {
                if (fs_1.default.existsSync(image.filePath)) {
                    fs_1.default.unlinkSync(image.filePath);
                }
                await prismaClient_1.prisma.uploadedImage.delete({
                    where: { id: imageId }
                });
                console.log(`[Upload] Auto-deleted unanalyzed image ${imageId}`);
            }
        }
        catch (error) {
            console.error(`[Upload] Failed to auto-delete image ${imageId}:`, error);
        }
    }, 60000);
    res.status(201).json({
        success: true,
        analysisId: imageRecord.id,
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
router.get('/images/:userId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { projectId, page = '1', limit = '20' } = req.query;
    await getOrCreateUser(userId);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
        uploadedById: userId,
        ...(projectId ? { projectId: projectId } : {})
    };
    const [images, total] = await Promise.all([
        prismaClient_1.prisma.uploadedImage.findMany({
            where,
            skip,
            take: parseInt(limit),
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
        prismaClient_1.prisma.uploadedImage.count({ where })
    ]);
    res.json({
        success: true,
        data: {
            images: images.map(img => ({
                ...img,
                fileSize: img.fileSize?.toString()
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));
router.get('/image/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const image = await prismaClient_1.prisma.uploadedImage.findUnique({
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
        throw (0, errorHandler_1.createError)('Image not found', 404);
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
router.delete('/image/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const image = await prismaClient_1.prisma.uploadedImage.findUnique({
        where: { id },
        select: { filePath: true, uploadedById: true }
    });
    if (!image) {
        throw (0, errorHandler_1.createError)('Image not found', 404);
    }
    if (fs_1.default.existsSync(image.filePath)) {
        fs_1.default.unlinkSync(image.filePath);
    }
    await prismaClient_1.prisma.uploadedImage.delete({
        where: { id }
    });
    res.json({
        success: true,
        message: 'Image deleted successfully'
    });
}));
router.post('/batch', upload.array('images', 10), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw (0, errorHandler_1.createError)('No files uploaded', 400);
    }
    const { userId, projectId } = req.body;
    const effectiveUserId = await getOrCreateUser(userId);
    const uploadedImages = [];
    for (const file of req.files) {
        const imageId = (0, uuid_1.v4)();
        const fileName = `${imageId}_${file.originalname}`;
        const processedImage = await (0, sharp_1.default)(file.buffer)
            .metadata()
            .catch(() => ({ width: null, height: null }));
        const imageRecord = await prismaClient_1.prisma.uploadedImage.create({
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
exports.default = router;
//# sourceMappingURL=upload.js.map