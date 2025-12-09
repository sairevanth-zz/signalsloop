/**
 * Prediction Loop Closure Service
 * 
 * Connects predictions to actual outcomes after features ship.
 * Calculates prediction accuracy and generates insights.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { complete } from '@/lib/ai/router';
import type {
    PredictionOutput,
    FeaturePrediction,
    ExplanationFactor
} from '@/types/prediction';

export interface LoopClosureResult {
    predictionId: string;
    outcomeId: string;

    // Predicted vs Actual
    comparisons: {
        metric: string;
        predicted: number | null;
        actual: number | null;
        accuracyScore: number; // 0-1, how close was the prediction
    }[];

    // Overall accuracy
    overallAccuracy: number; // 0-1

    // AI-generated insight
    insight: {
        accuracyRating: 'excellent' | 'good' | 'fair' | 'poor';
        summary: string;
        learnings: string[];
        improvements: string[];
    };

    closedAt: Date;
}

export interface LoopClosureStats {
    totalPredictions: number;
    closedLoops: number;
    averageAccuracy: number;
    byMetric: {
        adoption: { count: number; avgAccuracy: number };
        sentiment: { count: number; avgAccuracy: number };
        churn: { count: number; avgAccuracy: number };
    };
}

/**
 * Close the loop for a single prediction
 */
export async function closePredictionLoop(
    predictionId: string
): Promise<LoopClosureResult> {
    const supabase = getServiceRoleClient();

    if (!supabase) throw new Error('Database unavailable');

    // 1. Get the prediction
    const { data: prediction, error: predError } = await supabase
        .from('feature_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

    if (predError || !prediction) {
        throw new Error(`Prediction not found: ${predictionId}`);
    }

    // 2. Find the matching outcome (by spec_id or feature_name)
    const { data: outcome, error: outcomeError } = await supabase
        .from('feature_outcomes')
        .select('*')
        .eq('project_id', prediction.project_id)
        .eq('status', 'completed')
        .or(`spec_id.eq.${prediction.spec_id},feature_name.ilike.%${prediction.feature_name}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (outcomeError || !outcome) {
        throw new Error(`No completed outcome found for prediction ${predictionId}`);
    }

    // 3. Calculate accuracy for each metric
    const comparisons = [];

    // Adoption accuracy
    if (prediction.predicted_adoption_rate !== null && outcome.actual_adoption_rate !== null) {
        const accuracy = 1 - Math.abs(prediction.predicted_adoption_rate - outcome.actual_adoption_rate);
        comparisons.push({
            metric: 'adoption',
            predicted: prediction.predicted_adoption_rate,
            actual: outcome.actual_adoption_rate,
            accuracyScore: Math.max(0, accuracy)
        });
    }

    // Sentiment accuracy (normalize from -1,1 to 0,1 for comparison)
    if (prediction.predicted_sentiment_impact !== null && outcome.sentiment_delta !== null) {
        const normalizedPredicted = (prediction.predicted_sentiment_impact + 1) / 2;
        const normalizedActual = (outcome.sentiment_delta + 1) / 2;
        const accuracy = 1 - Math.abs(normalizedPredicted - normalizedActual);
        comparisons.push({
            metric: 'sentiment',
            predicted: prediction.predicted_sentiment_impact,
            actual: outcome.sentiment_delta,
            accuracyScore: Math.max(0, accuracy)
        });
    }

    // Churn accuracy
    if (prediction.predicted_churn_reduction !== null && outcome.churn_delta !== null) {
        const accuracy = 1 - Math.abs(prediction.predicted_churn_reduction - Math.abs(outcome.churn_delta));
        comparisons.push({
            metric: 'churn',
            predicted: prediction.predicted_churn_reduction,
            actual: Math.abs(outcome.churn_delta || 0),
            accuracyScore: Math.max(0, accuracy)
        });
    }

    // 4. Calculate overall accuracy
    const overallAccuracy = comparisons.length > 0
        ? comparisons.reduce((sum, c) => sum + c.accuracyScore, 0) / comparisons.length
        : 0;

    // 5. Generate AI insight
    const insight = await generateLoopInsight(prediction, outcome, comparisons, overallAccuracy);

    // 6. Update prediction with actual values
    await supabase
        .from('feature_predictions')
        .update({
            actual_adoption_rate: outcome.actual_adoption_rate,
            actual_sentiment_impact: outcome.sentiment_delta,
            prediction_accuracy: overallAccuracy,
            loop_closed: true,
            loop_closed_at: new Date().toISOString(),
            actual_vs_predicted: {
                comparisons,
                insight,
                outcomeId: outcome.id
            },
            updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);

    console.log(`[LoopClosure] Closed loop for prediction ${predictionId}, accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);

    return {
        predictionId,
        outcomeId: outcome.id,
        comparisons,
        overallAccuracy,
        insight,
        closedAt: new Date()
    };
}

/**
 * Generate AI insight for the prediction accuracy
 */
async function generateLoopInsight(
    prediction: any,
    outcome: any,
    comparisons: { metric: string; predicted: number | null; actual: number | null; accuracyScore: number }[],
    overallAccuracy: number
): Promise<LoopClosureResult['insight']> {
    const accuracyRating: 'excellent' | 'good' | 'fair' | 'poor' =
        overallAccuracy >= 0.8 ? 'excellent' :
            overallAccuracy >= 0.6 ? 'good' :
                overallAccuracy >= 0.4 ? 'fair' : 'poor';

    const prompt = `Analyze this prediction outcome comparison:

FEATURE: ${prediction.feature_name}
PREDICTION STRATEGY: ${prediction.prediction_strategy}
PREDICTION CONFIDENCE: ${(prediction.confidence_score * 100).toFixed(0)}%

COMPARISONS:
${comparisons.map(c =>
        `- ${c.metric}: Predicted ${c.predicted !== null ? (c.predicted * 100).toFixed(0) + '%' : 'N/A'} → Actual ${c.actual !== null ? (c.actual * 100).toFixed(0) + '%' : 'N/A'} (${(c.accuracyScore * 100).toFixed(0)}% accurate)`
    ).join('\n')}

OVERALL ACCURACY: ${(overallAccuracy * 100).toFixed(0)}%
RATING: ${accuracyRating}

OUTCOME: ${outcome.outcome_classification}

Generate:
1. A brief summary (1 sentence) of what we learned
2. 2-3 specific learnings from this comparison
3. 1-2 improvements for future predictions

Return JSON:
{
  "summary": "string",
  "learnings": ["string"],
  "improvements": ["string"]
}`;

    try {
        const response = await complete({
            type: 'generation',
            messages: [
                { role: 'system', content: 'You are a product analytics expert. Be concise and actionable.' },
                { role: 'user', content: prompt }
            ],
            options: {
                temperature: 0.3,
                maxTokens: 500,
                responseFormat: 'json'
            },
            costSensitive: true
        });

        const parsed = JSON.parse(response.content || '{}');

        return {
            accuracyRating,
            summary: parsed.summary || `Prediction was ${accuracyRating} with ${(overallAccuracy * 100).toFixed(0)}% accuracy`,
            learnings: parsed.learnings || [],
            improvements: parsed.improvements || []
        };
    } catch (error) {
        console.error('[LoopClosure] Error generating insight:', error);
        return {
            accuracyRating,
            summary: `Prediction was ${accuracyRating} with ${(overallAccuracy * 100).toFixed(0)}% accuracy`,
            learnings: [],
            improvements: []
        };
    }
}

/**
 * Close loops for all eligible predictions
 * Called by cron job
 */
export async function closeAllEligibleLoops(): Promise<{
    closed: number;
    failed: number;
    skipped: number;
}> {
    const supabase = getServiceRoleClient();

    if (!supabase) throw new Error('Database unavailable');

    // Find predictions that:
    // 1. Haven't been closed yet
    // 2. Have a matching completed outcome
    // 3. Are at least 30 days old
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: predictions } = await supabase
        .from('feature_predictions')
        .select('id, project_id, spec_id, feature_name')
        .eq('loop_closed', false)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .limit(50);

    let closed = 0;
    let failed = 0;
    let skipped = 0;

    for (const pred of predictions || []) {
        try {
            // Check if outcome exists
            const { data: outcome } = await supabase
                .from('feature_outcomes')
                .select('id')
                .eq('project_id', pred.project_id)
                .eq('status', 'completed')
                .limit(1);

            if (!outcome?.length) {
                skipped++;
                continue;
            }

            await closePredictionLoop(pred.id);
            closed++;
        } catch (error) {
            console.error(`[LoopClosure] Failed for ${pred.id}:`, error);
            failed++;
        }
    }

    console.log(`[LoopClosure] Complete: ${closed} closed, ${failed} failed, ${skipped} skipped`);
    return { closed, failed, skipped };
}

/**
 * Get loop closure statistics for a project
 */
export async function getLoopClosureStats(projectId: string): Promise<LoopClosureStats> {
    const supabase = getServiceRoleClient();

    if (!supabase) throw new Error('Database unavailable');

    const { data: predictions } = await supabase
        .from('feature_predictions')
        .select('id, loop_closed, prediction_accuracy, actual_vs_predicted')
        .eq('project_id', projectId);

    const total = predictions?.length || 0;
    const closed = predictions?.filter(p => p.loop_closed) || [];

    const avgAccuracy = closed.length > 0
        ? closed.reduce((sum, p) => sum + (p.prediction_accuracy || 0), 0) / closed.length
        : 0;

    // Calculate by-metric stats from actual_vs_predicted
    const byMetric = {
        adoption: { count: 0, avgAccuracy: 0 },
        sentiment: { count: 0, avgAccuracy: 0 },
        churn: { count: 0, avgAccuracy: 0 }
    };

    for (const pred of closed) {
        const comparisons = pred.actual_vs_predicted?.comparisons || [];
        for (const comp of comparisons) {
            const metric = comp.metric as keyof typeof byMetric;
            if (byMetric[metric]) {
                byMetric[metric].count++;
                byMetric[metric].avgAccuracy += comp.accuracyScore;
            }
        }
    }

    // Calculate averages
    for (const key of Object.keys(byMetric) as (keyof typeof byMetric)[]) {
        if (byMetric[key].count > 0) {
            byMetric[key].avgAccuracy = byMetric[key].avgAccuracy / byMetric[key].count;
        }
    }

    return {
        totalPredictions: total,
        closedLoops: closed.length,
        averageAccuracy: avgAccuracy,
        byMetric
    };
}
