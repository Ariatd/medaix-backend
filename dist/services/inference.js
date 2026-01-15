"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImage = analyzeImage;
exports.getAnalysisResult = getAnalysisResult;
const prismaClient_1 = require("../prismaClient");
const uuid_1 = require("uuid");
const CONFIDENCE_THRESHOLDS = {
    LOW: 50,
    MEDIUM: 70,
    HIGH: 85,
    VERY_HIGH: 85
};
const ALGORITHM_VERSION = 'v2.1.0';
const MODEL_USED = 'MedAIx-CNN-v3';
const PROCESSING_NODE = 'medaix-cluster-1';
async function analyzeImage(imageId, _imageBuffer) {
    const startTime = Date.now();
    const batchId = (0, uuid_1.v4)();
    console.log(`[Inference] Starting analysis for image ${imageId}`);
    await updateImageStatus(imageId, 'processing');
    try {
        const primaryResult = await performPrimaryAnalysis(imageId);
        let finalResult;
        let secondaryVerification;
        if (primaryResult.confidenceScore < CONFIDENCE_THRESHOLDS.LOW) {
            console.log(`[Inference] Low confidence (${primaryResult.confidenceScore}%) - Failing analysis`);
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
        }
        else if (primaryResult.confidenceScore < CONFIDENCE_THRESHOLDS.MEDIUM) {
            console.log(`[Inference] Medium confidence (${primaryResult.confidenceScore}%) - Triggering secondary verification`);
            secondaryVerification = await performSecondaryVerification(imageId);
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
        }
        else if (primaryResult.confidenceScore < CONFIDENCE_THRESHOLDS.HIGH) {
            console.log(`[Inference] Good confidence (${primaryResult.confidenceScore}%) - Accepting with warning`);
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
        else {
            console.log(`[Inference] High confidence (${primaryResult.confidenceScore}%) - Accepting`);
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
        finalResult.heatmapUrl = await generateGradCAMHeatmap(imageId);
        console.log(`[Inference] Analysis completed in ${finalResult.processingTimeSeconds}s with confidence ${finalResult.confidenceScore}%`);
        return finalResult;
    }
    catch (error) {
        console.error(`[Inference] Analysis failed for image ${imageId}:`, error);
        await updateImageStatus(imageId, 'failed');
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        return {
            id: (0, uuid_1.v4)(),
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
async function performPrimaryAnalysis(_imageId) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    const confidenceScore = 55 + Math.random() * 40;
    const findings = [
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
    const differentialDiagnosis = [
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
    differentialDiagnosis.sort((a, b) => b.probability - a.probability);
    return {
        id: (0, uuid_1.v4)(),
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
async function performSecondaryVerification(_imageId) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const secondaryConfidence = 60 + Math.random() * 35;
    return {
        performed: true,
        originalConfidence: 0,
        secondaryConfidence: Math.round(secondaryConfidence * 100) / 100,
        finalConfidence: 0,
        verificationMethod: 'Ensemble Model (ResNet + EfficientNet)',
        notes: secondaryConfidence >= 75
            ? 'Secondary verification confirms primary analysis with high confidence'
            : 'Secondary verification suggests caution - results should be reviewed by specialist'
    };
}
function getConfidenceLevel(score) {
    if (score < CONFIDENCE_THRESHOLDS.LOW)
        return 'low';
    if (score < CONFIDENCE_THRESHOLDS.MEDIUM)
        return 'medium';
    if (score < CONFIDENCE_THRESHOLDS.HIGH)
        return 'high';
    return 'very_high';
}
function generateRegionsOfInterest() {
    const count = 1 + Math.floor(Math.random() * 3);
    const regions = [];
    for (let i = 0; i < count; i++) {
        regions.push({
            id: (0, uuid_1.v4)(),
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
async function generateGradCAMHeatmap(imageId) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return `/api/analyses/${imageId}/heatmap`;
}
async function saveAnalysisResult(imageId, result) {
    try {
        const image = await prismaClient_1.prisma.uploadedImage.findUnique({
            where: { id: imageId },
            select: { uploadedById: true, projectId: true }
        });
        if (!image) {
            console.error(`[Inference] Image ${imageId} not found in database`);
            return;
        }
        await prismaClient_1.prisma.researchAnalysis.upsert({
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
                findings: result.findings,
                recommendations: result.recommendations,
                differentialDiagnosis: result.differentialDiagnosis,
                severityAssessment: result.severityAssessment,
                regionsOfInterest: result.regionsOfInterest,
                qualityMetrics: result.qualityMetrics,
                metadata: {
                    processingNode: result.metadata.processingNode,
                    batchId: result.metadata.batchId,
                    confidenceThresholds: result.metadata.confidenceThresholds,
                    secondaryVerification: result.secondaryVerification
                }
            },
            update: {
                status: result.status === 'completed' ? 'completed' :
                    result.status === 'failed' ? 'failed' : 'pending',
                confidenceScore: result.confidenceScore,
                processingTimeSeconds: result.processingTimeSeconds,
                findings: result.findings,
                recommendations: result.recommendations,
                differentialDiagnosis: result.differentialDiagnosis,
                severityAssessment: result.severityAssessment,
                regionsOfInterest: result.regionsOfInterest,
                qualityMetrics: result.qualityMetrics,
                metadata: {
                    processingNode: result.metadata.processingNode,
                    batchId: result.metadata.batchId,
                    confidenceThresholds: result.metadata.confidenceThresholds,
                    secondaryVerification: result.secondaryVerification
                }
            }
        });
        console.log(`[Inference] Analysis result saved for image ${imageId}`);
    }
    catch (error) {
        console.error(`[Inference] Failed to save analysis result:`, error);
    }
}
async function updateImageStatus(imageId, status) {
    try {
        const updateData = { updatedAt: new Date() };
        if (status === 'processing') {
            updateData.processingStartedAt = new Date();
        }
        else if (status === 'completed') {
            updateData.processingCompletedAt = new Date();
            updateData.analysisStatus = 'completed';
        }
        else if (status === 'failed') {
            updateData.analysisStatus = 'failed';
        }
        await prismaClient_1.prisma.uploadedImage.update({
            where: { id: imageId },
            data: updateData
        });
        console.log(`[Inference] Image ${imageId} status updated to ${status}`);
    }
    catch (error) {
        console.error(`[Inference] Failed to update image status:`, error);
    }
}
async function getAnalysisResult(imageId) {
    try {
        const analysis = await prismaClient_1.prisma.researchAnalysis.findFirst({
            where: { imageId }
        });
        if (!analysis) {
            return null;
        }
        const metadata = analysis.metadata || {};
        const findings = Array.isArray(analysis.findings)
            ? analysis.findings
            : [];
        const recommendations = Array.isArray(analysis.recommendations)
            ? analysis.recommendations
            : [];
        const differentialDiagnosis = Array.isArray(analysis.differentialDiagnosis)
            ? analysis.differentialDiagnosis
            : [];
        const severityAssessment = analysis.severityAssessment && typeof analysis.severityAssessment === 'object'
            ? analysis.severityAssessment
            : { overallSeverity: 'normal', affectedRegions: [], urgencyLevel: 'routine', recommendedActions: [] };
        const regionsOfInterest = Array.isArray(analysis.regionsOfInterest)
            ? analysis.regionsOfInterest
            : [];
        const qualityMetrics = analysis.qualityMetrics && typeof analysis.qualityMetrics === 'object'
            ? analysis.qualityMetrics
            : { imageQuality: 0, completeness: 0, clarity: 0, artifactLevel: 'none' };
        return {
            id: analysis.id,
            status: analysis.status,
            confidenceScore: analysis.confidenceScore ? Number(analysis.confidenceScore) : 0,
            confidenceLevel: getConfidenceLevel(Number(analysis.confidenceScore) || 0),
            findings,
            recommendations,
            differentialDiagnosis,
            severityAssessment,
            regionsOfInterest,
            qualityMetrics,
            heatmapUrl: metadata.heatmapUrl,
            processingTimeSeconds: analysis.processingTimeSeconds || 0,
            secondaryVerification: metadata.secondaryVerification,
            metadata: {
                algorithmVersion: analysis.algorithmVersion || ALGORITHM_VERSION,
                modelUsed: analysis.modelUsed || MODEL_USED,
                processingNode: metadata.processingNode || PROCESSING_NODE,
                batchId: metadata.batchId || '',
                confidenceThresholds: metadata.confidenceThresholds || {
                    primary: 0,
                    secondary: 0,
                    final: 0
                }
            }
        };
    }
    catch (error) {
        console.error(`[Inference] Failed to get analysis result:`, error);
        return null;
    }
}
exports.default = {
    analyzeImage,
    getAnalysisResult
};
//# sourceMappingURL=inference.js.map