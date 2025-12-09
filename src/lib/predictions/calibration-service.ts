/**
 * Confidence Calibration Service
 * 
 * Analyzes how well prediction confidence correlates with actual accuracy.
 * A well-calibrated system should have predictions with X% confidence
 * be correct X% of the time.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    CalibrationBucket,
    CalibrationCurveData,
    CalibrationTrend,
    CalibrationDashboardData
} from '@/types/confidence-calibration';

const BUCKET_SIZE = 0.1; // 10% buckets (0-10%, 10-20%, etc.)

/**
 * Calculate calibration curve for a project
 */
export async function calculateCalibrationCurve(
    projectId: string
): Promise<CalibrationCurveData> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    // Get predictions with outcomes
    const { data: predictions } = await supabase
        .from('feature_predictions')
        .select('id, feature_name, confidence_score, prediction_accuracy, loop_closed')
        .eq('project_id', projectId)
        .eq('loop_closed', true);

    const withOutcomes = predictions || [];
    const totalPredictions = (await supabase
        .from('feature_predictions')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)).count || 0;

    // Create buckets
    const buckets: CalibrationBucket[] = [];

    for (let i = 0; i < 10; i++) {
        const min = i * BUCKET_SIZE;
        const max = (i + 1) * BUCKET_SIZE;
        const label = `${Math.round(min * 100)}-${Math.round(max * 100)}%`;

        const bucketPredictions = withOutcomes.filter(p => {
            const conf = p.confidence_score || 0;
            return conf >= min && conf < max;
        });

        const avgConfidence = bucketPredictions.length > 0
            ? bucketPredictions.reduce((s, p) => s + (p.confidence_score || 0), 0) / bucketPredictions.length
            : (min + max) / 2;

        const actualAccuracy = bucketPredictions.length > 0
            ? bucketPredictions.reduce((s, p) => s + (p.prediction_accuracy || 0), 0) / bucketPredictions.length
            : 0;

        const calibrationError = Math.abs(avgConfidence - actualAccuracy);

        buckets.push({
            confidenceMin: min,
            confidenceMax: max,
            confidenceLabel: label,
            predictionCount: bucketPredictions.length,
            avgConfidence,
            actualAccuracy,
            calibrationError
        });
    }

    // Calculate overall metrics
    const nonEmptyBuckets = buckets.filter(b => b.predictionCount > 0);
    const totalBucketPredictions = nonEmptyBuckets.reduce((s, b) => s + b.predictionCount, 0);

    // Expected Calibration Error (ECE) - weighted average of bucket errors
    const ece = totalBucketPredictions > 0
        ? nonEmptyBuckets.reduce((s, b) => s + (b.calibrationError * b.predictionCount), 0) / totalBucketPredictions
        : 0;

    // Max Calibration Error (MCE) - worst bucket
    const mce = nonEmptyBuckets.length > 0
        ? Math.max(...nonEmptyBuckets.map(b => b.calibrationError))
        : 0;

    // Over/under confidence ratios
    const overconfidentBuckets = nonEmptyBuckets.filter(b => b.avgConfidence > b.actualAccuracy);
    const underconfidentBuckets = nonEmptyBuckets.filter(b => b.avgConfidence < b.actualAccuracy);

    const overconfidenceRatio = nonEmptyBuckets.length > 0
        ? overconfidentBuckets.length / nonEmptyBuckets.length
        : 0;
    const underconfidenceRatio = nonEmptyBuckets.length > 0
        ? underconfidentBuckets.length / nonEmptyBuckets.length
        : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    const calibrationQuality = getCalibrationQuality(ece);

    if (ece > 0.15) {
        recommendations.push('High calibration error - predictions are frequently over or under confident');
    }
    if (overconfidenceRatio > 0.6) {
        recommendations.push('System tends to be overconfident - consider adding uncertainty factors');
    }
    if (underconfidenceRatio > 0.6) {
        recommendations.push('System tends to be underconfident - confidence scores could be higher');
    }
    if (withOutcomes.length < 20) {
        recommendations.push('Limited data - calibration metrics will improve with more outcome data');
    }
    if (calibrationQuality === 'excellent') {
        recommendations.push('Excellent calibration - confidence scores are reliable indicators of accuracy');
    }

    return {
        projectId,
        buckets,
        expectedCalibrationError: ece,
        maxCalibrationError: mce,
        overconfidenceRatio,
        underconfidenceRatio,
        calibrationQuality,
        recommendations,
        totalPredictions,
        predictionsWithOutcomes: withOutcomes.length,
        calculatedAt: new Date()
    };
}

function getCalibrationQuality(ece: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (ece <= 0.05) return 'excellent';
    if (ece <= 0.10) return 'good';
    if (ece <= 0.20) return 'fair';
    return 'poor';
}

/**
 * Get calibration trends over time
 */
export async function getCalibrationTrends(
    projectId: string,
    months: number = 6
): Promise<CalibrationTrend[]> {
    const supabase = getServiceRoleClient();
    if (!supabase) throw new Error('Database unavailable');

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: predictions } = await supabase
        .from('feature_predictions')
        .select('created_at, confidence_score, prediction_accuracy, loop_closed')
        .eq('project_id', projectId)
        .eq('loop_closed', true)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    // Group by month
    const byMonth = new Map<string, { predictions: typeof predictions }>();

    for (const pred of predictions || []) {
        const month = new Date(pred.created_at).toISOString().slice(0, 7);
        if (!byMonth.has(month)) {
            byMonth.set(month, { predictions: [] });
        }
        byMonth.get(month)!.predictions!.push(pred);
    }

    const trends: CalibrationTrend[] = [];
    let prevEce = 0;

    for (const [month, data] of byMonth) {
        const preds = data.predictions || [];

        // Calculate simple ECE for this month
        const ece = preds.length > 0
            ? preds.reduce((s, p) => s + Math.abs((p.confidence_score || 0) - (p.prediction_accuracy || 0)), 0) / preds.length
            : 0;

        const trend: 'improving' | 'declining' | 'stable' =
            ece < prevEce - 0.02 ? 'improving' :
                ece > prevEce + 0.02 ? 'declining' : 'stable';

        trends.push({
            month,
            ece,
            predictionCount: preds.length,
            trend
        });

        prevEce = ece;
    }

    return trends;
}

/**
 * Get full calibration dashboard data
 */
export async function getCalibrationDashboardData(
    projectId: string
): Promise<CalibrationDashboardData> {
    const [curve, trends] = await Promise.all([
        calculateCalibrationCurve(projectId),
        getCalibrationTrends(projectId)
    ]);

    // Find recent miscalibrated predictions
    const supabase = getServiceRoleClient();
    const { data: recent } = await supabase!
        .from('feature_predictions')
        .select('id, feature_name, confidence_score, prediction_accuracy')
        .eq('project_id', projectId)
        .eq('loop_closed', true)
        .order('created_at', { ascending: false })
        .limit(20);

    const recentMiscalibrations = (recent || [])
        .map(p => ({
            predictionId: p.id,
            featureName: p.feature_name,
            confidence: p.confidence_score || 0,
            actualAccuracy: p.prediction_accuracy || 0,
            error: Math.abs((p.confidence_score || 0) - (p.prediction_accuracy || 0))
        }))
        .filter(p => p.error > 0.2) // Only show significant miscalibrations
        .slice(0, 5);

    return {
        curve,
        trends,
        recentMiscalibrations
    };
}
