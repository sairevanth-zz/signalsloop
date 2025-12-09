/**
 * Prediction Accuracy Service
 * 
 * Collects and analyzes prediction accuracy metrics.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    AccuracyStats,
    AccuracyTrend,
    AccuracyDashboardData,
    PredictionAccuracyRecord
} from '@/types/prediction-accuracy';

/**
 * Get prediction accuracy statistics for a project
 */
export async function getAccuracyStats(projectId: string): Promise<AccuracyStats> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    // Get all predictions with outcomes
    const { data: predictions } = await supabase
        .from('feature_predictions')
        .select('*')
        .eq('project_id', projectId);

    const all = predictions || [];
    const withOutcomes = all.filter(p => p.loop_closed);

    // Calculate overall accuracy
    const overallAccuracy = withOutcomes.length > 0
        ? withOutcomes.reduce((sum, p) => sum + (p.prediction_accuracy || 0), 0) / withOutcomes.length
        : 0;

    // Calculate by metric
    const adoptionPredictions = withOutcomes.filter(p =>
        p.predicted_adoption_rate !== null && p.actual_adoption_rate !== null);
    const sentimentPredictions = withOutcomes.filter(p =>
        p.predicted_sentiment_impact !== null && p.actual_sentiment_impact !== null);

    const calculateMetricAccuracy = (preds: typeof withOutcomes, predKey: string, actualKey: string) => {
        if (preds.length === 0) return 0;
        return preds.reduce((sum, p) => {
            const pred = p[predKey] as number;
            const actual = p[actualKey] as number;
            return sum + (1 - Math.abs(pred - actual));
        }, 0) / preds.length;
    };

    // Calculate by strategy
    const byStrategy = {
        heuristic: { count: 0, avgAccuracy: 0 },
        similar_features: { count: 0, avgAccuracy: 0 },
        ml_model: { count: 0, avgAccuracy: 0 }
    };

    for (const strategy of ['heuristic', 'similar_features', 'ml_model'] as const) {
        const strategyPreds = withOutcomes.filter(p => p.prediction_strategy === strategy);
        byStrategy[strategy] = {
            count: strategyPreds.length,
            avgAccuracy: strategyPreds.length > 0
                ? strategyPreds.reduce((sum, p) => sum + (p.prediction_accuracy || 0), 0) / strategyPreds.length
                : 0
        };
    }

    // Calculate by confidence band
    const byConfidence = {
        high: { count: 0, avgAccuracy: 0 },
        medium: { count: 0, avgAccuracy: 0 },
        low: { count: 0, avgAccuracy: 0 }
    };

    const highConf = withOutcomes.filter(p => (p.confidence_score || 0) >= 0.7);
    const medConf = withOutcomes.filter(p => (p.confidence_score || 0) >= 0.4 && (p.confidence_score || 0) < 0.7);
    const lowConf = withOutcomes.filter(p => (p.confidence_score || 0) < 0.4);

    byConfidence.high = {
        count: highConf.length,
        avgAccuracy: highConf.length > 0
            ? highConf.reduce((s, p) => s + (p.prediction_accuracy || 0), 0) / highConf.length
            : 0
    };
    byConfidence.medium = {
        count: medConf.length,
        avgAccuracy: medConf.length > 0
            ? medConf.reduce((s, p) => s + (p.prediction_accuracy || 0), 0) / medConf.length
            : 0
    };
    byConfidence.low = {
        count: lowConf.length,
        avgAccuracy: lowConf.length > 0
            ? lowConf.reduce((s, p) => s + (p.prediction_accuracy || 0), 0) / lowConf.length
            : 0
    };

    return {
        totalPredictions: all.length,
        predictionsWithOutcomes: withOutcomes.length,
        overallAccuracy,
        adoptionAccuracy: {
            count: adoptionPredictions.length,
            avgAccuracy: calculateMetricAccuracy(adoptionPredictions, 'predicted_adoption_rate', 'actual_adoption_rate'),
            trend: 'stable'
        },
        sentimentAccuracy: {
            count: sentimentPredictions.length,
            avgAccuracy: calculateMetricAccuracy(sentimentPredictions, 'predicted_sentiment_impact', 'actual_sentiment_impact'),
            trend: 'stable'
        },
        churnAccuracy: {
            count: 0,
            avgAccuracy: 0,
            trend: 'stable'
        },
        byStrategy,
        byConfidence
    };
}

/**
 * Get accuracy trends over time
 */
export async function getAccuracyTrends(
    projectId: string,
    months: number = 6
): Promise<AccuracyTrend[]> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: predictions } = await supabase
        .from('feature_predictions')
        .select('created_at, prediction_accuracy, loop_closed')
        .eq('project_id', projectId)
        .eq('loop_closed', true)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    // Group by month
    const byMonth = new Map<string, { count: number; totalAccuracy: number }>();

    for (const pred of predictions || []) {
        const month = new Date(pred.created_at).toISOString().slice(0, 7); // YYYY-MM
        if (!byMonth.has(month)) {
            byMonth.set(month, { count: 0, totalAccuracy: 0 });
        }
        const entry = byMonth.get(month)!;
        entry.count++;
        entry.totalAccuracy += pred.prediction_accuracy || 0;
    }

    return Array.from(byMonth.entries()).map(([month, data]) => ({
        month,
        predictions: data.count,
        avgAccuracy: data.count > 0 ? data.totalAccuracy / data.count : 0,
        adoptionAccuracy: 0, // Would calculate separately
        sentimentAccuracy: 0
    }));
}

/**
 * Get full dashboard data
 */
export async function getAccuracyDashboardData(
    projectId: string
): Promise<AccuracyDashboardData> {
    const [stats, trends] = await Promise.all([
        getAccuracyStats(projectId),
        getAccuracyTrends(projectId)
    ]);

    // Get recent predictions
    const supabase = getServiceRoleClient();
    const { data: recent } = await supabase!
        .from('feature_predictions')
        .select('id, feature_name, created_at, prediction_strategy, confidence_score, predicted_adoption_rate, actual_adoption_rate, prediction_accuracy, loop_closed')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

    const recentPredictions: PredictionAccuracyRecord[] = (recent || []).map(p => ({
        id: p.id,
        projectId,
        predictionId: p.id,
        featureName: p.feature_name,
        predictionDate: new Date(p.created_at),
        predictionStrategy: p.prediction_strategy,
        confidenceScore: p.confidence_score || 0,
        predictedAdoption: p.predicted_adoption_rate,
        predictedSentiment: null,
        predictedChurn: null,
        actualAdoption: p.actual_adoption_rate,
        actualSentiment: null,
        actualChurn: null,
        adoptionAccuracy: null,
        sentimentAccuracy: null,
        churnAccuracy: null,
        overallAccuracy: p.prediction_accuracy || 0,
        outcomeDate: null,
        loopClosed: p.loop_closed || false
    }));

    // Build calibration data
    const calibrationData = [
        { confidenceBucket: '0-20%', avgConfidence: 0.1, actualAccuracy: stats.byConfidence.low.avgAccuracy },
        { confidenceBucket: '20-40%', avgConfidence: 0.3, actualAccuracy: stats.byConfidence.low.avgAccuracy },
        { confidenceBucket: '40-60%', avgConfidence: 0.5, actualAccuracy: stats.byConfidence.medium.avgAccuracy },
        { confidenceBucket: '60-80%', avgConfidence: 0.7, actualAccuracy: stats.byConfidence.high.avgAccuracy },
        { confidenceBucket: '80-100%', avgConfidence: 0.9, actualAccuracy: stats.byConfidence.high.avgAccuracy }
    ];

    return {
        stats,
        trends,
        recentPredictions,
        calibrationData
    };
}
