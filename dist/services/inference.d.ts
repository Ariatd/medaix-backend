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
export declare function analyzeImage(imageId: string, _imageBuffer?: Buffer): Promise<AnalysisResult>;
export declare function getAnalysisResult(imageId: string): Promise<AnalysisResult | null>;
declare const _default: {
    analyzeImage: typeof analyzeImage;
    getAnalysisResult: typeof getAnalysisResult;
};
export default _default;
//# sourceMappingURL=inference.d.ts.map