/**
 * Confidence Calibration Types
 * 
 * Types for analyzing how well prediction confidence correlates
 * with actual accuracy (a well-calibrated system should have
 * 70% confidence predictions be correct 70% of the time).
 */

export interface CalibrationBucket {
    // Confidence range
    confidenceMin: number;
    confidenceMax: number;
    confidenceLabel: string; // e.g., "60-70%"

    // Prediction counts
    predictionCount: number;

    // Average confidence in this bucket
    avgConfidence: number;

    // Actual accuracy for predictions in this bucket
    actualAccuracy: number;

    // Calibration error for this bucket
    calibrationError: number; // |avgConfidence - actualAccuracy|
}

export interface CalibrationCurveData {
    projectId: string;
    buckets: CalibrationBucket[];

    // Overall calibration metrics
    expectedCalibrationError: number; // ECE - weighted average of bucket errors
    maxCalibrationError: number; // MCE - worst bucket
    overconfidenceRatio: number; // % of buckets where confidence > accuracy
    underconfidenceRatio: number; // % of buckets where confidence < accuracy

    // Recommendations
    calibrationQuality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];

    // Sample size
    totalPredictions: number;
    predictionsWithOutcomes: number;

    calculatedAt: Date;
}

export interface CalibrationTrend {
    month: string;
    ece: number; // Expected Calibration Error
    predictionCount: number;
    trend: 'improving' | 'declining' | 'stable';
}

export interface CalibrationDashboardData {
    curve: CalibrationCurveData;
    trends: CalibrationTrend[];
    recentMiscalibrations: {
        predictionId: string;
        featureName: string;
        confidence: number;
        actualAccuracy: number;
        error: number;
    }[];
}
