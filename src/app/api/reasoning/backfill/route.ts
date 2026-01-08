/**
 * Backfill Reasoning Traces API
 * 
 * POST /api/reasoning/backfill
 * Populates the AI Reasoning Layer with traces from historical AI decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { createReasoningTrace } from '@/lib/reasoning/capture-reasoning';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId } = body;

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = getServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database connection not available' },
                { status: 500 }
            );
        }

        const stats = {
            sentiment: 0,
            themes: 0,
            predictions: 0,
            errors: 0,
        };

        console.log(`[Reasoning Backfill] Starting backfill for project ${projectId}`);

        // 1. Backfill sentiment analyses
        const { data: sentimentData, error: sentimentError } = await supabase
            .from('sentiment_analysis')
            .select(`
        post_id,
        sentiment_category,
        sentiment_score,
        emotional_tone,
        confidence_score,
        analyzed_at,
        posts!inner(project_id)
      `)
            .eq('posts.project_id', projectId)
            .order('analyzed_at', { ascending: false })
            .limit(50);

        if (sentimentError) {
            console.error('[Reasoning Backfill] Sentiment fetch error:', sentimentError);
        } else if (sentimentData && sentimentData.length > 0) {
            console.log(`[Reasoning Backfill] Processing ${sentimentData.length} sentiment records`);

            for (const item of sentimentData) {
                try {
                    await createReasoningTrace({
                        projectId,
                        feature: 'sentiment_analysis',
                        decisionType: 'sentiment_classified',
                        decisionSummary: `Classified as ${item.sentiment_category} (score: ${item.sentiment_score?.toFixed(2)})`,
                        dataSources: [{ type: 'feedback_text', count: 1 }],
                        reasoningSteps: [
                            {
                                step_number: 1,
                                description: 'Analyzed text sentiment indicators',
                                evidence: [`Emotional tone: ${item.emotional_tone || 'neutral'}`],
                                conclusion: `Sentiment: ${item.sentiment_category}`,
                                confidence: item.confidence_score || 0.8,
                            },
                        ],
                        decision: `${item.sentiment_category} (${item.sentiment_score?.toFixed(2)})`,
                        confidence: item.confidence_score || 0.8,
                        entityType: 'post',
                        entityId: item.post_id,
                    });
                    stats.sentiment++;
                } catch (err) {
                    stats.errors++;
                    console.error('[Reasoning Backfill] Sentiment trace error:', err);
                }
            }
        }

        // 2. Backfill theme detections
        const { data: themeData, error: themeError } = await supabase
            .from('themes')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (themeError) {
            console.error('[Reasoning Backfill] Theme fetch error:', themeError);
        } else if (themeData && themeData.length > 0) {
            console.log(`[Reasoning Backfill] Processing ${themeData.length} theme records`);

            for (const theme of themeData) {
                try {
                    await createReasoningTrace({
                        projectId,
                        feature: 'theme_detection',
                        decisionType: 'themes_extracted',
                        decisionSummary: `Detected theme: "${theme.theme_name}" (${theme.frequency} mentions)`,
                        dataSources: [{ type: 'feedback', count: theme.frequency || 1 }],
                        reasoningSteps: [
                            {
                                step_number: 1,
                                description: `Identified theme: ${theme.theme_name}`,
                                evidence: [
                                    `Category: ${theme.category || 'general'}`,
                                    `Frequency: ${theme.frequency} mentions`,
                                    `Avg sentiment: ${theme.avg_sentiment?.toFixed(2) || 'N/A'}`,
                                ],
                                conclusion: `Theme "${theme.theme_name}" detected`,
                                confidence: 0.85,
                            },
                        ],
                        decision: theme.theme_name,
                        confidence: 0.85,
                        entityType: 'theme',
                        entityId: theme.id,
                    });
                    stats.themes++;
                } catch (err) {
                    stats.errors++;
                    console.error('[Reasoning Backfill] Theme trace error:', err);
                }
            }
        }

        // 3. Backfill predictions
        const { data: predictionData, error: predictionError } = await supabase
            .from('feature_predictions')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (predictionError) {
            console.error('[Reasoning Backfill] Prediction fetch error:', predictionError);
        } else if (predictionData && predictionData.length > 0) {
            console.log(`[Reasoning Backfill] Processing ${predictionData.length} prediction records`);

            for (const pred of predictionData) {
                try {
                    const factors = pred.explanation_factors || [];
                    await createReasoningTrace({
                        projectId,
                        feature: 'prediction',
                        decisionType: 'feature_success_prediction',
                        decisionSummary: `Predicted ${Math.round((pred.predicted_adoption_rate || 0) * 100)}% adoption for "${pred.feature_name}"`,
                        dataSources: [
                            { type: 'feature_inputs', count: Object.keys(pred.input_features || {}).length },
                        ],
                        reasoningSteps: [
                            {
                                step_number: 1,
                                description: 'Feature Analysis',
                                evidence: factors.slice(0, 3).map((f: any) => `${f.factor}: ${f.impact}`),
                                conclusion: `Strategy: ${pred.prediction_strategy || 'hybrid'}`,
                                confidence: pred.confidence_score || 0.8,
                            },
                            {
                                step_number: 2,
                                description: 'Adoption Prediction',
                                evidence: [
                                    `Adoption rate: ${Math.round((pred.predicted_adoption_rate || 0) * 100)}%`,
                                    `Confidence interval: ${Math.round((pred.confidence_interval_low || 0) * 100)}-${Math.round((pred.confidence_interval_high || 0) * 100)}%`,
                                ],
                                conclusion: pred.explanation_text?.slice(0, 200) || 'Prediction generated',
                                confidence: pred.confidence_score || 0.8,
                            },
                        ],
                        decision: `${Math.round((pred.predicted_adoption_rate || 0) * 100)}% predicted adoption`,
                        confidence: pred.confidence_score || 0.8,
                        modelUsed: pred.model_name || 'gpt-4o',
                        entityType: 'prediction',
                        entityId: pred.id,
                    });
                    stats.predictions++;
                } catch (err) {
                    stats.errors++;
                    console.error('[Reasoning Backfill] Prediction trace error:', err);
                }
            }
        }

        console.log(`[Reasoning Backfill] Complete:`, stats);

        return NextResponse.json({
            success: true,
            message: 'Backfill completed',
            stats,
            total: stats.sentiment + stats.themes + stats.predictions,
        });
    } catch (error: any) {
        console.error('[Reasoning Backfill] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Backfill failed' },
            { status: 500 }
        );
    }
}
