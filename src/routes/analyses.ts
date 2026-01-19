import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../server';
import { getAnalysisResult, AnalysisResult as InferenceAnalysisResult } from '../services/inference';
// Render deploy tetikleme denemesi v2
const router = express.Router();

// Analysis type definition matching Prisma schema
interface AnalysisRecord {
  id: string;
  projectId: string | null;
  imageId: string | null;
  analystId: string;
  analysisType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'review_required';
  confidenceScore: number | null;
  processingTimeSeconds: number | null;
  algorithmVersion: string | null;
  modelUsed: string | null;
  findings: any[];
  recommendations: any[];
  differentialDiagnosis: any[];
  severityAssessment: any | null;
  regionsOfInterest: any | null;
  qualityMetrics: any | null;
  errorMessage: string | null;
  reviewRequired: boolean;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Transform database analysis to frontend AnalysisResult format
function transformAnalysisForFrontend(
  analysis: any,
  fullResult: InferenceAnalysisResult | null
) {
  const confidenceScore = analysis.confidenceScore 
    ? Number(analysis.confidenceScore) 
    : (fullResult?.confidenceScore ?? 0);

  return {
    id: analysis.id,
    status: analysis.status as 'pending' | 'processing' | 'completed' | 'failed',
    confidenceScore,
    confidenceLevel: getConfidenceLevel(confidenceScore),
    findings: Array.isArray(analysis.findings) ? analysis.findings : (fullResult?.findings || []),
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : (fullResult?.recommendations || []),
    differentialDiagnosis: Array.isArray(analysis.differentialDiagnosis) ? analysis.differentialDiagnosis : (fullResult?.differentialDiagnosis || []),
    severityAssessment: analysis.severityAssessment || fullResult?.severityAssessment || null,
    regionsOfInterest: Array.isArray(analysis.regionsOfInterest) ? analysis.regionsOfInterest : (fullResult?.regionsOfInterest || []),
    qualityMetrics: analysis.qualityMetrics || fullResult?.qualityMetrics || null,
    heatmapUrl: fullResult?.heatmapUrl,
    processingTimeSeconds: analysis.processingTimeSeconds || fullResult?.processingTimeSeconds || 0,
    secondaryVerification: fullResult?.secondaryVerification,
    metadata: fullResult?.metadata || {
      algorithmVersion: analysis.algorithmVersion || 'v2.1.0',
      modelUsed: analysis.modelUsed || 'MedAIx-CNN-v3',
      processingNode: 'medaix-cluster-1',
      batchId: '',
      confidenceThresholds: { primary: 0, secondary: 0, final: 0 }
    },
    image: analysis.image ? {
      id: analysis.imageId || analysis.image.id,
      fileName: analysis.image.originalFileName || 'Unknown',
      imageType: analysis.image.imageType || 'standard'
    } : undefined,
    createdAt: analysis.createdAt instanceof Date ? analysis.createdAt.toISOString() : String(analysis.createdAt),
    completedAt: analysis.updatedAt instanceof Date ? analysis.updatedAt.toISOString() : String(analysis.updatedAt),
    error: analysis.errorMessage || undefined
  };
}

// Get confidence level label based on score
function getConfidenceLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score < 50) return 'low';
  if (score < 70) return 'medium';
  if (score < 85) return 'high';
  return 'very_high';
}

// Mock analyses data - maintaining compatibility with existing localStorage structure
const mockAnalyses: AnalysisRecord[] = [
  {
    id: 'analysis-1',
    projectId: 'project-1',
    imageId: 'image-1',
    analystId: 'user-123',
    analysisType: 'medical_imaging',
    status: 'completed',
    confidenceScore: 0.92,
    processingTimeSeconds: 45,
    algorithmVersion: 'v2.1.0',
    modelUsed: 'MedAIx-CNN-v3',
    findings: [
      {
        description: 'Normal anatomical structures observed',
        confidence: 0.95,
        region: 'chest',
        severity: 'normal'
      },
      {
        description: 'No acute abnormalities detected',
        confidence: 0.88,
        region: 'cardiac',
        severity: 'normal'
      }
    ],
    recommendations: [
      'Routine follow-up recommended',
      'No immediate intervention required'
    ],
    differentialDiagnosis: [
      {
        condition: 'Normal variant',
        probability: 0.85
      },
      {
        condition: 'Benign finding',
        probability: 0.12
      },
      {
        condition: 'Pathologic finding',
        probability: 0.03
      }
    ],
    severityAssessment: null,
    regionsOfInterest: null,
    qualityMetrics: {
      imageQuality: 0.95,
      completeness: 0.98,
      clarity: 0.92
    },
    errorMessage: null,
    reviewRequired: false,
    reviewedById: null,
    reviewedAt: null,
    reviewNotes: null,
    approvedById: null,
    approvedAt: null,
    metadata: {
      processingNode: 'medaix-cluster-1',
      gpuUsed: 'NVIDIA-V100',
      batchId: 'batch-2024-001'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];


router.get('/image/:id', asyncHandler(async (req: Request, res: Response) => {
  console.log('HIT: /image/:id endpoint called');
  const { id } = req.params;

  // Try to get from database first
  try {
    const dbAnalysis = await prisma.researchAnalysis.findFirst({
      where: { imageId: id },
      include: {
        image: {
          select: {
            originalFileName: true,
            fileSize: true,
            mimeType: true,
            imageType: true,
            createdAt: true
          }
        },
        analyst: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (dbAnalysis) {
      // Get full result from inference service
      const fullResult = await getAnalysisResult(id);
      
      // Transform database result to match frontend expectations
      const result = transformAnalysisForFrontend(dbAnalysis, fullResult);

      // Return response WITHOUT data wrapper
      res.json({
        success: true,
        analysis: result
      });
      return;
    }
  } catch (error) {
    console.error('Error fetching analysis from database:', error);
  }

  // Fallback to mock data if not found in database
  const mockAnalysis = mockAnalyses.find(a => a.id === id);

  if (!mockAnalysis) {
    throw createError('Analysis not found', 404);
  }

  // Return response WITHOUT data wrapper
  res.json({
    success: true,
    analysis: transformAnalysisForFrontend(mockAnalysis, null)
  });
}));


// @route   GET /api/analyses
// @desc    Get analyses with filtering and pagination
// @access  Private
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    projectId,
    imageId,
    analystId,
    status,
    analysisType,
    startDate,
    endDate,
    minConfidence,
    maxConfidence,
    page = 1,
    limit = 20
  } = req.query;

  // Build where clause for filtering
  const where: any = {};

  // Filter by analystId from query or use a default for now
  // In production, this would come from authenticated user
  if (analystId) {
    where.analystId = analystId;
  }

  if (projectId) {
    where.projectId = projectId;
  }

  if (imageId) {
    where.imageId = imageId;
  }

  if (status) {
    where.status = status;
  }

  if (analysisType) {
    where.analysisType = analysisType;
  }

  if (minConfidence || maxConfidence) {
    where.confidenceScore = {};
    if (minConfidence) {
      where.confidenceScore.gte = parseFloat(minConfidence as string);
    }
    if (maxConfidence) {
      where.confidenceScore.lte = parseFloat(minConfidence as string);
    }
  }

  // Date range filtering
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate as string);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate as string);
    }
  }

  try {
    // Get total count for pagination from database
    const total = await prisma.researchAnalysis.count({ where });

    // Get paginated results from database
    const analyses = await prisma.researchAnalysis.findMany({
      where,
      include: {
        image: {
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            mimeType: true,
            imageType: true,
            createdAt: true
          }
        },
        analyst: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            description: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    });

    // Calculate summary statistics
    const completedAnalyses = analyses.filter(a => a.status === 'completed');
    const successRate = analyses.length > 0
      ? (completedAnalyses.length / analyses.length) * 100
      : 0;

    const avgConfidence = completedAnalyses.length > 0
      ? completedAnalyses.reduce((sum, a) => sum + (a.confidenceScore ? Number(a.confidenceScore) : 0), 0) / completedAnalyses.length
      : 0;

    // Transform analyses to frontend format
    const transformedAnalyses = await Promise.all(
      analyses.map(async (analysis) => {
        // Handle potential null/undefined imageId with proper type guard
        const fullResult = analysis.imageId 
          ? await getAnalysisResult(analysis.imageId) 
          : null;
        return transformAnalysisForFrontend(analysis, fullResult);
      })
    );

    // Return response WITHOUT data wrapper
    res.json({
      success: true,
      analyses: transformedAnalyses,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      summary: {
        totalAnalyses: total,
        completedAnalyses: completedAnalyses.length,
        pendingAnalyses: analyses.filter(a => a.status === 'pending').length,
        failedAnalyses: analyses.filter(a => a.status === 'failed').length,
        successRate: Math.round(successRate * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching analyses from database:', error);
    // Fallback to empty array if database error - return WITHOUT data wrapper
    res.json({
      success: true,
      analyses: [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: 0,
        pages: 0
      },
      summary: {
        totalAnalyses: 0,
        completedAnalyses: 0,
        pendingAnalyses: 0,
        failedAnalyses: 0,
        successRate: 0,
        avgConfidence: 0
      }
    });
  }
}));

// @route   GET /api/analyses/image/:id
// @desc    Get analysis result by image ID
// @access  Private


// @route   POST /api/analyses
// @desc    Create new analysis and save to database
// @access  Private
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    projectId,
    imageId,
    analystId,
    analysisType = 'medical_imaging',
    algorithmVersion,
    modelUsed
  } = req.body;

  if (!imageId || !analystId) {
    throw createError('Image ID and Analyst ID are required', 400);
  }

  const analysisId = uuidv4();

  try {
    // Save analysis to Prisma database
    const newAnalysis = await prisma.researchAnalysis.create({
      data: {
        id: analysisId,
        projectId: projectId || null,
        imageId,
        analystId,
        analysisType,
        status: 'pending',
        confidenceScore: null,
        processingTimeSeconds: null,
        algorithmVersion: algorithmVersion || null,
        modelUsed: modelUsed || null,
        findings: [],
        recommendations: [],
        differentialDiagnosis: [],
        // Use empty objects for JSON fields that should be null
        severityAssessment: {},
        regionsOfInterest: {},
        qualityMetrics: {},
        errorMessage: null,
        reviewRequired: false,
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
        approvedById: null,
        approvedAt: null,
        metadata: {}
      }
    });

    res.status(201).json({
      success: true,
      analysis: {
        id: newAnalysis.id,
        status: newAnalysis.status,
        createdAt: newAnalysis.createdAt.toISOString()
      },
      message: 'Analysis created successfully'
    });
  } catch (error) {
    console.error('Error creating analysis in database:', error);
    throw createError('Failed to create analysis', 500);
  }
}));

// @route   GET /api/analyses/:id
// @desc    Get specific analysis by analysis ID
// @access  Private
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Try to get from database first
  try {
    const dbAnalysis = await prisma.researchAnalysis.findUnique({
      where: { id },
      include: {
        image: {
          select: {
            originalFileName: true,
            fileSize: true,
            mimeType: true,
            imageType: true,
            createdAt: true
          }
        },
        analyst: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (dbAnalysis) {
      // Get full result from inference service
      const fullResult = dbAnalysis.imageId 
        ? await getAnalysisResult(dbAnalysis.imageId) 
        : null;
      
      // Transform database result to match frontend expectations
      const result = transformAnalysisForFrontend(dbAnalysis, fullResult);

      // Return response WITHOUT data wrapper
      res.json({
        success: true,
        analysis: result
      });
      return;
    }
  } catch (error) {
    console.error('Error fetching analysis from database:', error);
  }

  // Fallback to mock data
  const analysis = mockAnalyses.find(a => a.id === id);

  if (!analysis) {
    throw createError('Analysis not found', 404);
  }

  // Return response WITHOUT data wrapper
  res.json({
    success: true,
    analysis: transformAnalysisForFrontend(analysis, null)
  });
}));

// @route   PATCH /api/analyses/:id
// @desc    Update analysis
// @access  Private
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Try to update in database
    const updatedAnalysis = await prisma.researchAnalysis.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      analysis: transformAnalysisForFrontend(updatedAnalysis, null)
    });
    return;
  } catch (error) {
    console.error('Error updating analysis in database:', error);
  }

  // Fallback to mock data
  const analysisIndex = mockAnalyses.findIndex(a => a.id === id);

  if (analysisIndex === -1) {
    throw createError('Analysis not found', 404);
  }

  // Update analysis
  mockAnalyses[analysisIndex] = {
    ...mockAnalyses[analysisIndex],
    ...updates,
    updatedAt: new Date()
  } as AnalysisRecord;

  // Return response WITHOUT data wrapper
  res.json({
    success: true,
    analysis: transformAnalysisForFrontend(mockAnalyses[analysisIndex], null)
  });
}));

// @route   POST /api/analyses/:id/complete
// @desc    Mark analysis as completed with results
// @access  Private
router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    findings,
    recommendations,
    differentialDiagnosis,
    confidenceScore,
    processingTimeSeconds,
    qualityMetrics,
    severityAssessment,
    regionsOfInterest
  } = req.body;

  try {
    // Try to update in database
    const updatedAnalysis = await prisma.researchAnalysis.update({
      where: { id },
      data: {
        status: 'completed',
        findings: findings || [],
        recommendations: recommendations || [],
        differentialDiagnosis: differentialDiagnosis || [],
        confidenceScore: confidenceScore || null,
        processingTimeSeconds: processingTimeSeconds || null,
        qualityMetrics: qualityMetrics || null,
        severityAssessment: severityAssessment || null,
        regionsOfInterest: regionsOfInterest || null,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      analysis: transformAnalysisForFrontend(updatedAnalysis, null),
      message: 'Analysis completed successfully'
    });
    return;
  } catch (error) {
    console.error('Error completing analysis in database:', error);
  }

  // Fallback to mock data
  const analysisIndex = mockAnalyses.findIndex(a => a.id === id);

  if (analysisIndex === -1) {
    throw createError('Analysis not found', 404);
  }

  // Update analysis with completion data
  mockAnalyses[analysisIndex] = {
    ...mockAnalyses[analysisIndex],
    status: 'completed',
    findings: findings || [],
    recommendations: recommendations || [],
    differentialDiagnosis: differentialDiagnosis || [],
    confidenceScore: confidenceScore || null,
    processingTimeSeconds: processingTimeSeconds || null,
    qualityMetrics: qualityMetrics || null,
    updatedAt: new Date()
  } as AnalysisRecord;

  // Return response WITHOUT data wrapper
  res.json({
    success: true,
    analysis: transformAnalysisForFrontend(mockAnalyses[analysisIndex], null),
    message: 'Analysis completed successfully'
  });
}));

// @route   POST /api/analyses/:id/fail
// @desc    Mark analysis as failed
// @access  Private
router.post('/:id/fail', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { errorMessage } = req.body;

  try {
    // Try to update in database
    const updatedAnalysis = await prisma.researchAnalysis.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: errorMessage || 'Analysis failed',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      analysis: transformAnalysisForFrontend(updatedAnalysis, null),
      message: 'Analysis marked as failed'
    });
    return;
  } catch (error) {
    console.error('Error failing analysis in database:', error);
  }

  // Fallback to mock data
  const analysisIndex = mockAnalyses.findIndex(a => a.id === id);

  if (analysisIndex === -1) {
    throw createError('Analysis not found', 404);
  }

  // Update analysis as failed
  mockAnalyses[analysisIndex] = {
    ...mockAnalyses[analysisIndex],
    status: 'failed',
    errorMessage: errorMessage || 'Analysis failed',
    updatedAt: new Date()
  } as AnalysisRecord;

  // Return response WITHOUT data wrapper
  res.json({
    success: true,
    analysis: transformAnalysisForFrontend(mockAnalyses[analysisIndex], null),
    message: 'Analysis marked as failed'
  });
}));

// @route   GET /api/analyses/user/:userId/statistics
// @desc    Get user analysis statistics
// @access  Private
router.get('/user/:userId/statistics', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Get statistics from database
    const userAnalyses = await prisma.researchAnalysis.findMany({
      where: { analystId: userId }
    });

    const totalAnalyses = userAnalyses.length;
    const completedAnalyses = userAnalyses.filter(a => a.status === 'completed').length;
    const failedAnalyses = userAnalyses.filter(a => a.status === 'failed').length;
    
    const successRate = totalAnalyses > 0 
      ? (completedAnalyses / totalAnalyses) * 100 
      : 0;

    // Count analyses this month
    const now = new Date();
    const thisMonth = userAnalyses.filter(a => {
      const analysisDate = new Date(a.createdAt);
      return analysisDate.getMonth() === now.getMonth() &&
             analysisDate.getFullYear() === now.getFullYear();
    }).length;

    // Average confidence from completed analyses
    const completedWithConfidence = userAnalyses.filter(a => 
      a.status === 'completed' && a.confidenceScore !== null
    );
    const avgConfidence = completedWithConfidence.length > 0
      ? completedWithConfidence.reduce((sum, a) => sum + (Number(a.confidenceScore) || 0), 0) / completedWithConfidence.length
      : 0;

    const statistics = {
      totalAnalyses,
      successRate: Math.round(successRate * 100) / 100,
      thisMonth,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      completedAnalyses,
      failedAnalyses,
      pendingAnalyses: userAnalyses.filter(a => a.status === 'pending').length
    };

    // Return response WITHOUT data wrapper
    res.json({
      success: true,
      statistics
    });
    return;
  } catch (error) {
    console.error('Error fetching user statistics from database:', error);
  }

  // Fallback to mock data
  const userAnalyses = mockAnalyses.filter(a => a.analystId === userId);

  const totalAnalyses = userAnalyses.length;
  const completedAnalyses = userAnalyses.filter(a => a.status === 'completed').length;
  const failedAnalyses = userAnalyses.filter(a => a.status === 'failed').length;
  
  const successRate = totalAnalyses > 0 
    ? (completedAnalyses / totalAnalyses) * 100 
    : 0;

  const now = new Date();
  const thisMonth = userAnalyses.filter(a => {
    const analysisDate = new Date(a.createdAt);
    return analysisDate.getMonth() === now.getMonth() &&
           analysisDate.getFullYear() === now.getFullYear();
  }).length;

  const completedWithConfidence = userAnalyses.filter(a => 
    a.status === 'completed' && a.confidenceScore !== null
  );
  const avgConfidence = completedWithConfidence.length > 0
    ? completedWithConfidence.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / completedWithConfidence.length
    : 0;

  const statistics = {
    totalAnalyses,
    successRate: Math.round(successRate * 100) / 100,
    thisMonth,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    completedAnalyses,
    failedAnalyses,
    pendingAnalyses: userAnalyses.filter(a => a.status === 'pending').length
  };

  // Return response WITHOUT data wrapper
  res.json({
    success: true,
    statistics
  });
}));

// @route   DELETE /api/analyses/:id
// @desc    Delete analysis
// @access  Private
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Try to delete from database
    await prisma.researchAnalysis.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });
    return;
  } catch (error) {
    console.error('Error deleting analysis from database:', error);
  }

  // Fallback to mock data
  const analysisIndex = mockAnalyses.findIndex(a => a.id === id);

  if (analysisIndex === -1) {
    throw createError('Analysis not found', 404);
  }

  mockAnalyses.splice(analysisIndex, 1);

  res.json({
    success: true,
    message: 'Analysis deleted successfully'
  });
}));

export default router;

