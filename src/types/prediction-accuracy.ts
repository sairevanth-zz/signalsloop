/**
 * Prediction Accuracy Types
 * 
 * Types for tracking and displaying prediction accuracy metrics.
 */

export interface PredictionAccuracyRecord {
    id: string;
    projectId: string;
    predictionId: string;
    featureName: string;

    // Prediction details
    predictionDate: Date;
    predictionStrategy: 'heuristic' | 'similar_features' | 'ml_model';
    confidenceScore: number;

    // Predictions
    predictedAdoption: number | null;
    predictedSentiment: number | null;
    predictedChurn: number | null;

    // Actuals
    actualAdoption: number | null;
    actualSentiment: number | null;
    actualChurn: number | null;

    // Accuracy metrics
    adoptionAccuracy: number | null;
    sentimentAccuracy: number | null;
    churnAccuracy: number | null;
    overallAccuracy: number;

    // Outcome
    outcomeDate: Date | null;
    loopClosed: boolean;
}

export interface AccuracyStats {
    // Overall
    totalPredictions: number;
    predictionsWithOutcomes: number;
    overallAccuracy: number;

    // By metric
    adoptionAccuracy: {
        count: number;
        avgAccuracy: number;
        trend: 'improving' | 'declining' | 'stable';
    };
    sentimentAccuracy: {
        count: number;
        avgAccuracy: number;
        trend: 'improving' | 'declining' | 'stable';
    };
    churnAccuracy: {
        count: number;
        avgAccuracy: number;
        trend: 'improving' | 'declining' | 'stable';
    };

    // By strategy
    byStrategy: {
        heuristic: { count: number; avgAccuracy: number };
        similar_features: { count: number; avgAccuracy: number };
        ml_model: { count: number; avgAccuracy: number };
    };

    // By confidence band
    byConfidence: {
        high: { count: number; avgAccuracy: number }; // 0.7+
        medium: { count: number; avgAccuracy: number }; // 0.4-0.7
        low: { count: number; avgAccuracy: number }; // <0.4
    };
}

export interface AccuracyTrend {
    month: string;
    predictions: number;
    avgAccuracy: number;
    adoptionAccuracy: number;
    sentimentAccuracy: number;
}

export interface AccuracyDashboardData {
    stats: AccuracyStats;
    trends: AccuracyTrend[];
    recentPredictions: PredictionAccuracyRecord[];
    calibrationData: {
        confidenceBucket: string;
        avgConfidence: number;
        actualAccuracy: number;
    }[];
}
