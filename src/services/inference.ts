/**
 * MedAIx Inference Service
 * Implements Multi-Stage Confidence Logic per HLD Section 4.7
 * 
 * Confidence Thresholds:
 * - < 50%: High uncertainty - Auto-fail with suggestion to retry
 * - 50-70%: Medium confidence - Require secondary verification
 * - 70-85%: Good confidence - Accept with yellow warning
 * - 85-100%: High confidence - Accept with green confirmation
 */

import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';

export interface AnalysisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high' | 'very_high';
  findings: Finding[];
  recommendations: string[];
  differentialDiagnosis: DifferentialDiagnosis[];
  severityAssessment: SeverityAssessment;
  regionsOfInterest: RegionOfInterest[];
  qualityMetrics: QualityMetrics;
  heatmapUrl?: string;
  processingTimeSeconds: number;
  secondaryVerification?: SecondaryVerificationResult;
  metadata: {
    algorithmVersion: string;
    modelUsed: string;
    processingNode: string;
    batchId: string;
    confidenceThresholds: {
      primary: number;
      secondary: number;
      final: number;
    };
  };
}

export interface Finding {
  description: string;
  confidence: number;
  region: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DifferentialDiagnosis {
  condition: string;
  probability: number;
  excluded?: boolean;
}

export interface SeverityAssessment {
  overallSeverity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  affectedRegions: string[];
  urgencyLevel: 'routine' | 'soon' | 'urgent' | 'emergent';
  recommendedActions: string[];
}

export interface RegionOfInterest {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  description: string;
}

export interface QualityMetrics {
  imageQuality: number;
  completeness: number;
  clarity: number;
  artifactLevel: 'none' | 'minimal' | 'moderate' | 'significant';
}

export interface SecondaryVerificationResult {
  performed: boolean;
  originalConfidence: number;
  secondaryConfidence: number;
  finalConfidence: number;
  verificationMethod: string;
  notes: string;
}

// Confidence threshold constants
const CONFIDENCE_THRESHOLDS = {
  LOW: 50,      // < 50%: Auto-fail
  MEDIUM: 70,   // 50-70%: Secondary verification
  HIGH: 85,     // 70-85%: Yellow warning
  VERY_HIGH: 85 // 85-100%: Green confirmation
};

const ALGORITHM_VERSION = 'v2.1.0';
const MODEL_USED = 'MedAIx-CNN-v3';
const PROCESSING_NODE = 'medaix-cluster-1';

/**
 * Main analysis function with multi-stage confidence logic
 */
export async function analyzeImage(
  imageId: string,
  _imageBuffer?: Buffer
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const batchId = uuidv4();

  // Update status to processing
  await updateImageStatus(imageId, 'processing');

  try {
    // Phase 1: Primary Analysis
    const primaryResult = await performPrimaryAnalysis(imageId);
    
    let finalResult: AnalysisResult;
    let secondaryVerification: SecondaryVerificationResult | undefined;

    // Phase 2: Confidence-based decision making
    if (primaryResult.confidenceScore < CONFIDENCE_THRESHOLDS.LOW) {
      // < 50%: High uncertainty - Auto-fail
      
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      
      finalResult = {
        id: primaryResult.id,
        status: 'failed',
        confidenceScore: primaryResult.confidenceScore,
        confidenceLevel: 'low',
        findings: primaryResult.findings,
        recommendations: primaryResult.recommendations,
        differentialDiagnosis: primaryResult.differentialDiagnosis,
        severityAssessment: primaryResult.severityAssessment,
        regionsOfInterest: primaryResult.regionsOfInterest,
        qualityMetrics: {
          ...primaryResult.qualityMetrics,
          imageQuality: Math.max(0, primaryResult.qualityMetrics.imageQuality - 0.2)
        },
        processingTimeSeconds: processingTime,
        metadata: {
          algorithmVersion: ALGORITHM_VERSION,
          modelUsed: MODEL_USED,
          processingNode: PROCESSING_NODE,
          batchId,
          confidenceThresholds: {
            primary: primaryResult.confidenceScore,
            secondary: 0,
            final: 0
          }
        }
      };

      await saveAnalysisResult(imageId, finalResult);
      await updateImageStatus(imageId, 'failed');
      
      return finalResult;
    } else if (primaryResult.confidenceScore < CONFIDENCE_THRESHOLDS.MEDIUM) {
      // 50-70%: Medium confidence - Require secondary verification
      
      secondaryVerification = await performSecondaryVerification(imageId);
      
      // Calculate final confidence as weighted average
      const finalConfidence = (primaryResult.confidenceScore * 0.4) + (secondaryVerification.secondaryConfidence * 0.6);
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      
      finalResult = {
        id: primaryResult.id,
        status: 'completed',
        confidenceScore: Math.round(finalConfidence * 100) / 100,
        confidenceLevel: getConfidenceLevel(finalConfidence),
        findings: primaryResult.findings,
        recommendations: primaryResult.recommendations,
        differentialDiagnosis: primaryResult.differentialDiagnosis,
        severityAssessment: primaryResult.severityAssessment,
        regionsOfInterest: primaryResult.regionsOfInterest,
        qualityMetrics: primaryResult.qualityMetrics,
        processingTimeSeconds: processingTime,
        secondaryVerification: {
          ...secondaryVerification,
          originalConfidence: primaryResult.confidenceScore,
          finalConfidence: Math.round(finalConfidence * 100) / 100
        },
        metadata: {
          algorithmVersion: ALGORITHM_VERSION,
          modelUsed: MODEL_USED,
          processingNode: PROCESSING_NODE,
          batchId,
          confidenceThresholds: {
            primary: primaryResult.confidenceScore,
            secondary: secondaryVerification.secondaryConfidence,
            final: Math.round(finalConfidence * 100) / 100
          }
        }
      };

      await saveAnalysisResult(imageId, finalResult);
      await updateImageStatus(imageId, 'completed');
    } else if (primaryResult.confidenceScore < CONFIDENCE_THRESHOLDS.HIGH) {
      // 70-85%: Good confidence - Accept with yellow warning
      
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      
      finalResult = {
        id: primaryResult.id,
        status: 'completed',
        confidenceScore: primaryResult.confidenceScore,
        confidenceLevel: getConfidenceLevel(primaryResult.confidenceScore),
        findings: primaryResult.findings,
        recommendations: primaryResult.recommendations,
        differentialDiagnosis: primaryResult.differentialDiagnosis,
        severityAssessment: primaryResult.severityAssessment,
        regionsOfInterest: primaryResult.regionsOfInterest,
        qualityMetrics: primaryResult.qualityMetrics,
        processingTimeSeconds: processingTime,
        metadata: {
          algorithmVersion: ALGORITHM_VERSION,
          modelUsed: MODEL_USED,
          processingNode: PROCESSING_NODE,
          batchId,
          confidenceThresholds: {
            primary: primaryResult.confidenceScore,
            secondary: 0,
            final: primaryResult.confidenceScore
          }
        }
      };

      await saveAnalysisResult(imageId, finalResult);
      await updateImageStatus(imageId, 'completed');
    } else {
      // 85-100%: High confidence - Accept with green confirmation
      
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      
      finalResult = {
        id: primaryResult.id,
        status: 'completed',
        confidenceScore: primaryResult.confidenceScore,
        confidenceLevel: getConfidenceLevel(primaryResult.confidenceScore),
        findings: primaryResult.findings,
        recommendations: primaryResult.recommendations,
        differentialDiagnosis: primaryResult.differentialDiagnosis,
        severityAssessment: primaryResult.severityAssessment,
        regionsOfInterest: primaryResult.regionsOfInterest,
        qualityMetrics: primaryResult.qualityMetrics,
        processingTimeSeconds: processingTime,
        metadata: {
          algorithmVersion: ALGORITHM_VERSION,
          modelUsed: MODEL_USED,
          processingNode: PROCESSING_NODE,
          batchId,
          confidenceThresholds: {
            primary: primaryResult.confidenceScore,
            secondary: 0,
            final: primaryResult.confidenceScore
          }
        }
      };

      await saveAnalysisResult(imageId, finalResult);
      await updateImageStatus(imageId, 'completed');
    }

    // Generate simulated Grad-CAM++ heatmap
    finalResult.heatmapUrl = await generateGradCAMHeatmap(imageId);

    return finalResult;

  } catch (error) {
    console.error(`[Inference] Analysis failed for image ${imageId}:`, error);
    
    await updateImageStatus(imageId, 'failed');
    
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    
    return {
      id: uuidv4(),
      status: 'failed',
      confidenceScore: 0,
      confidenceLevel: 'low',
      findings: [],
      recommendations: ['Please retry with a clearer image'],
      differentialDiagnosis: [],
      severityAssessment: {
        overallSeverity: 'normal',
        affectedRegions: [],
        urgencyLevel: 'routine',
        recommendedActions: ['Retry analysis']
      },
      regionsOfInterest: [],
      qualityMetrics: {
        imageQuality: 0,
        completeness: 0,
        clarity: 0,
        artifactLevel: 'significant'
      },
      processingTimeSeconds: processingTime,
      metadata: {
        algorithmVersion: ALGORITHM_VERSION,
        modelUsed: MODEL_USED,
        processingNode: PROCESSING_NODE,
        batchId,
        confidenceThresholds: {
          primary: 0,
          secondary: 0,
          final: 0
        }
      }
    };
  }
}

/**
 * Phase 1: Primary Analysis
 * Performs initial image analysis using CNN model
 */
async function performPrimaryAnalysis(
  _imageId: string
): Promise<Omit<AnalysisResult, 'status' | 'processingTimeSeconds' | 'metadata'>> {
  // Simulate CNN-based analysis delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Generate mock analysis results based on image characteristics
  // In production, this would call the actual ML model
  const confidenceScore = 55 + Math.random() * 40; // 55-95%
  
  const findings: Finding[] = [
    {
      description: 'Normal anatomical structures observed in the examined region',
      confidence: confidenceScore,
      region: 'Primary',
      severity: 'normal'
    },
    {
      description: 'No acute abnormalities detected',
      confidence: confidenceScore - 5,
      region: 'Secondary',
      severity: 'normal'
    }
  ];

  // Generate differential diagnosis
  const differentialDiagnosis: DifferentialDiagnosis[] = [
    {
      condition: 'Normal Variant',
      probability: Math.min(0.95, confidenceScore / 100 + Math.random() * 0.1)
    },
    {
      condition: 'Benign Finding',
      probability: Math.random() * 0.15
    },
    {
      condition: 'Pathologic Finding',
      probability: Math.max(0, (100 - confidenceScore) / 100 - 0.05)
    }
  ];

  // Sort by probability
  differentialDiagnosis.sort((a, b) => b.probability - a.probability);

  return {
    id: uuidv4(),
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    confidenceLevel: getConfidenceLevel(confidenceScore),
    findings,
    recommendations: [
      'Routine follow-up recommended',
      'No immediate intervention required',
      'Clinical correlation advised'
    ],
    differentialDiagnosis,
    severityAssessment: {
      overallSeverity: 'normal',
      affectedRegions: [],
      urgencyLevel: 'routine',
      recommendedActions: ['Continue routine monitoring']
    },
    regionsOfInterest: generateRegionsOfInterest(),
    qualityMetrics: {
      imageQuality: 0.85 + Math.random() * 0.15,
      completeness: 0.9 + Math.random() * 0.1,
      clarity: 0.8 + Math.random() * 0.2,
      artifactLevel: 'minimal'
    }
  };
}

/**
 * Phase 2: Secondary Verification
 * Additional analysis for medium confidence cases (50-70%)
 */
async function performSecondaryVerification(
  _imageId: string
): Promise<SecondaryVerificationResult> {
  // Simulate different verification method (e.g., ensemble approach)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Use a different algorithm for verification
  const secondaryConfidence = 60 + Math.random() * 35; // 60-95%

  return {
    performed: true,
    originalConfidence: 0, // Will be filled by caller
    secondaryConfidence: Math.round(secondaryConfidence * 100) / 100,
    finalConfidence: 0, // Will be calculated by caller
    verificationMethod: 'Ensemble Model (ResNet + EfficientNet)',
    notes: secondaryConfidence >= 75 
      ? 'Secondary verification confirms primary analysis with high confidence'
      : 'Secondary verification suggests caution - results should be reviewed by specialist'
  };
}

/**
 * Get confidence level label based on score
 */
function getConfidenceLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score < CONFIDENCE_THRESHOLDS.LOW) return 'low';
  if (score < CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  if (score < CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  return 'very_high';
}

/**
 * Generate regions of interest for visualization
 */
function generateRegionsOfInterest(): RegionOfInterest[] {
  const count = 1 + Math.floor(Math.random() * 3);
  const regions: RegionOfInterest[] = [];

  for (let i = 0; i < count; i++) {
    regions.push({
      id: uuidv4(),
      x: Math.random() * 0.5,
      y: Math.random() * 0.5,
      width: 0.1 + Math.random() * 0.3,
      height: 0.1 + Math.random() * 0.3,
      confidence: 0.7 + Math.random() * 0.3,
      description: `Region ${i + 1} analysis area`
    });
  }

  return regions;
}

/**
 * Generate simulated Grad-CAM++ heatmap
 * In production, this would use actual Grad-CAM++ implementation
 */
async function generateGradCAMHeatmap(imageId: string): Promise<string> {
  // Simulate Grad-CAM++ generation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return a mock heatmap URL
  // In production, this would be the actual heatmap image path
  return `/api/analyses/${imageId}/heatmap`;
}

/**
 * Save analysis result to database
 * Creates a ResearchAnalysis record when analysis completes
 */
async function saveAnalysisResult(
  imageId: string,
  result: AnalysisResult
): Promise<void> {
  try {
    // Find the user who uploaded the image
    const image = await prisma.uploadedImage.findUnique({
      where: { id: imageId },
      select: { uploadedById: true, projectId: true }
    });

    if (!image) {
      console.error(`[Inference] Image ${imageId} not found in database - cannot save analysis result`);
      return;
    }

    // Create or update analysis record
    const analysisRecord = await prisma.researchAnalysis.upsert({
      where: { id: result.id },
      create: {
        id: result.id,
        projectId: image.projectId,
        imageId: imageId,
        analystId: image.uploadedById,
        analysisType: 'medical_imaging',
        status: result.status === 'completed' ? 'completed' : 
                result.status === 'failed' ? 'failed' : 'pending',
        confidenceScore: result.confidenceScore,
        processingTimeSeconds: result.processingTimeSeconds,
        algorithmVersion: result.metadata.algorithmVersion,
        modelUsed: result.metadata.modelUsed,
        findings: result.findings as unknown as any,
        recommendations: result.recommendations as unknown as any,
        differentialDiagnosis: result.differentialDiagnosis as unknown as any,
        severityAssessment: result.severityAssessment as unknown as any,
        regionsOfInterest: result.regionsOfInterest as unknown as any,
        qualityMetrics: result.qualityMetrics as unknown as any,
        metadata: {
          processingNode: result.metadata.processingNode,
          batchId: result.metadata.batchId,
          confidenceThresholds: result.metadata.confidenceThresholds,
          secondaryVerification: result.secondaryVerification
        } as any
      },
      update: {
        status: result.status === 'completed' ? 'completed' : 
                result.status === 'failed' ? 'failed' : 'pending',
        confidenceScore: result.confidenceScore,
        processingTimeSeconds: result.processingTimeSeconds,
        findings: result.findings as unknown as any,
        recommendations: result.recommendations as unknown as any,
        differentialDiagnosis: result.differentialDiagnosis as unknown as any,
        severityAssessment: result.severityAssessment as unknown as any,
        regionsOfInterest: result.regionsOfInterest as unknown as any,
        qualityMetrics: result.qualityMetrics as unknown as any,
        metadata: {
          processingNode: result.metadata.processingNode,
          batchId: result.metadata.batchId,
          confidenceThresholds: result.metadata.confidenceThresholds,
          secondaryVerification: result.secondaryVerification
        } as any
      }
    });
  } catch (error) {
    console.error(`[Inference] Failed to save analysis result for image ${imageId}:`, error);
  }
}

/**
 * Update image status in database
 */
async function updateImageStatus(
  imageId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (status === 'processing') {
      updateData.processingStartedAt = new Date();
    } else if (status === 'completed') {
      updateData.processingCompletedAt = new Date();
      updateData.analysisStatus = 'completed';
    } else if (status === 'failed') {
      updateData.analysisStatus = 'failed';
    }

    await prisma.uploadedImage.update({
      where: { id: imageId },
      data: updateData
    });
  } catch (error) {
    console.error(`[Inference] Failed to update image status:`, error);
  }
}

/**
 * Get analysis result by image ID
 */
export async function getAnalysisResult(imageId: string): Promise<AnalysisResult | null> {
  try {
    const analysis = await prisma.researchAnalysis.findFirst({
      where: { imageId }
    });

    if (!analysis) {
      return null;
    }

    const metadata = (analysis.metadata as Record<string, unknown>) || {};

    // Safely cast JSON fields
    const findings = Array.isArray(analysis.findings) 
      ? (analysis.findings as unknown as Finding[])
      : [];
    const recommendations = Array.isArray(analysis.recommendations)
      ? (analysis.recommendations as string[])
      : [];
    const differentialDiagnosis = Array.isArray(analysis.differentialDiagnosis)
      ? (analysis.differentialDiagnosis as unknown as DifferentialDiagnosis[])
      : [];
    const severityAssessment = analysis.severityAssessment && typeof analysis.severityAssessment === 'object'
      ? (analysis.severityAssessment as unknown as SeverityAssessment)
      : { overallSeverity: 'normal' as const, affectedRegions: [], urgencyLevel: 'routine' as const, recommendedActions: [] };
    const regionsOfInterest = Array.isArray(analysis.regionsOfInterest)
      ? (analysis.regionsOfInterest as unknown as RegionOfInterest[])
      : [];
    const qualityMetrics = analysis.qualityMetrics && typeof analysis.qualityMetrics === 'object'
      ? (analysis.qualityMetrics as unknown as QualityMetrics)
      : { imageQuality: 0, completeness: 0, clarity: 0, artifactLevel: 'none' as const };

    return {
      id: analysis.id,
      status: analysis.status as 'pending' | 'processing' | 'completed' | 'failed',
      confidenceScore: analysis.confidenceScore ? Number(analysis.confidenceScore) : 0,
      confidenceLevel: getConfidenceLevel(Number(analysis.confidenceScore) || 0),
      findings,
      recommendations,
      differentialDiagnosis,
      severityAssessment,
      regionsOfInterest,
      qualityMetrics,
      heatmapUrl: metadata.heatmapUrl as string | undefined,
      processingTimeSeconds: analysis.processingTimeSeconds || 0,
      secondaryVerification: metadata.secondaryVerification as SecondaryVerificationResult | undefined,
      metadata: {
        algorithmVersion: analysis.algorithmVersion || ALGORITHM_VERSION,
        modelUsed: analysis.modelUsed || MODEL_USED,
        processingNode: (metadata.processingNode as string) || PROCESSING_NODE,
        batchId: (metadata.batchId as string) || '',
        confidenceThresholds: (metadata.confidenceThresholds as {
          primary: number;
          secondary: number;
          final: number;
        }) || {
          primary: 0,
          secondary: 0,
          final: 0
        }
      }
    };
  } catch (error) {
    console.error(`[Inference] Failed to get analysis result:`, error);
    return null;
  }
}

export default {
  analyzeImage,
  getAnalysisResult
};

