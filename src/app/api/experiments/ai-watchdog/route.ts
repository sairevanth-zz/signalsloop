/**
 * AI Experiment Watchdog API
 * Monitors running experiments for anomalies, statistical health, and provides recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

interface WatchdogResult {
    experimentId: string;
    status: 'healthy' | 'warning' | 'critical';
    anomalies: Anomaly[];
    recommendations: Recommendation[];
    projections: Projection;
    healthScore: number;
}

interface Anomaly {
    type: 'sample_ratio_mismatch' | 'novelty_effect' | 'unexpected_variance' | 'segment_imbalance';
    severity: 'low' | 'medium' | 'high';
    description: string;
    detectedAt: string;
}

interface Recommendation {
    action: 'continue' | 'stop_early_winner' | 'stop_no_effect' | 'investigate' | 'extend_duration';
    confidence: number;
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
}

interface Projection {
    daysToSignificance: number | null;
    projectedWinner: 'control' | 'treatment' | 'inconclusive' | null;
    projectedLift: number | null;
    confidenceToReach95: number;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');

    if (!experimentId) {
        return NextResponse.json({ error: 'Experiment ID required' }, { status: 400 });
    }

    try {
        const supabase = await getSupabaseServiceRoleClient();

        // Fetch experiment details
        const { data: experiment, error: expError } = await supabase
            .from('experiments')
            .select('*')
            .eq('id', experimentId)
            .single();

        if (expError || !experiment) {
            return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
        }

        // Fetch results
        const { data: results } = await supabase
            .from('experiment_results')
            .select('*')
            .eq('experiment_id', experimentId);

        const watchdogResult = await analyzeExperiment(experiment, results || []);

        return NextResponse.json(watchdogResult);
    } catch (error) {
        console.error('[AI Watchdog] Error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}

async function analyzeExperiment(experiment: any, results: any[]): Promise<WatchdogResult> {
    const anomalies: Anomaly[] = [];
    const recommendations: Recommendation[] = [];
    let healthScore = 100;

    // Get sample sizes by variant
    const controlResults = results.filter(r => r.variant === 'control');
    const treatmentResults = results.filter(r => r.variant === 'treatment');

    const controlSampleSize = controlResults.reduce((sum, r) => sum + (r.sample_size || 0), 0);
    const treatmentSampleSize = treatmentResults.reduce((sum, r) => sum + (r.sample_size || 0), 0);
    const totalSampleSize = controlSampleSize + treatmentSampleSize;

    // Check for Sample Ratio Mismatch (SRM)
    if (totalSampleSize > 100) {
        const expectedRatio = 0.5;
        const actualRatio = controlSampleSize / totalSampleSize;
        const srmDeviation = Math.abs(actualRatio - expectedRatio);

        if (srmDeviation > 0.05) {
            anomalies.push({
                type: 'sample_ratio_mismatch',
                severity: srmDeviation > 0.1 ? 'high' : 'medium',
                description: `Sample ratio is ${(actualRatio * 100).toFixed(1)}% control vs ${((1 - actualRatio) * 100).toFixed(1)}% treatment. Expected 50/50. This could indicate a bug in randomization.`,
                detectedAt: new Date().toISOString(),
            });
            healthScore -= srmDeviation > 0.1 ? 30 : 15;
        }
    }

    // Check for unusual variance
    const primaryResults = results.filter(r => r.metric_name === experiment.primary_metric);
    if (primaryResults.length >= 2) {
        const controlPrimary = primaryResults.find(r => r.variant === 'control');
        const treatmentPrimary = primaryResults.find(r => r.variant === 'treatment');

        if (controlPrimary && treatmentPrimary) {
            const controlCV = controlPrimary.std_dev ? (controlPrimary.std_dev / controlPrimary.mean_value) : 0;
            const treatmentCV = treatmentPrimary.std_dev ? (treatmentPrimary.std_dev / treatmentPrimary.mean_value) : 0;

            if (Math.abs(controlCV - treatmentCV) > 0.3) {
                anomalies.push({
                    type: 'unexpected_variance',
                    severity: 'medium',
                    description: 'Control and treatment groups show significantly different variance patterns. This could indicate different user segments or external factors.',
                    detectedAt: new Date().toISOString(),
                });
                healthScore -= 10;
            }
        }
    }

    // Calculate projections
    const projections = calculateProjections(experiment, results, totalSampleSize);

    // Generate recommendations based on analysis
    const significantResult = primaryResults.find(r => r.statistical_significance && r.variant === 'treatment');
    const progress = totalSampleSize / (experiment.sample_size_target * 2);

    if (significantResult && progress >= 0.5) {
        recommendations.push({
            action: 'stop_early_winner',
            confidence: 0.85,
            reasoning: `Treatment shows statistically significant improvement (p=${significantResult.p_value?.toFixed(4)}). You can consider stopping early if the effect size meets your minimum requirements.`,
            priority: 'high',
        });
    } else if (progress >= 0.8 && !significantResult) {
        const controlPrimary = primaryResults.find(r => r.variant === 'control');
        const treatmentPrimary = primaryResults.find(r => r.variant === 'treatment');

        if (controlPrimary && treatmentPrimary) {
            const lift = ((treatmentPrimary.mean_value - controlPrimary.mean_value) / controlPrimary.mean_value) * 100;

            if (Math.abs(lift) < experiment.minimum_detectable_effect * 100 * 0.5) {
                recommendations.push({
                    action: 'stop_no_effect',
                    confidence: 0.7,
                    reasoning: `At ${(progress * 100).toFixed(0)}% sample size, the observed effect (${lift.toFixed(1)}%) is well below your minimum detectable effect. Consider stopping to save resources.`,
                    priority: 'medium',
                });
            }
        }
    } else if (progress < 0.3 && anomalies.length === 0) {
        recommendations.push({
            action: 'continue',
            confidence: 0.95,
            reasoning: 'Experiment is progressing normally. Continue collecting data to reach statistical significance.',
            priority: 'low',
        });
    }

    if (anomalies.some(a => a.severity === 'high')) {
        recommendations.unshift({
            action: 'investigate',
            confidence: 0.9,
            reasoning: 'Critical anomalies detected. Pause the experiment and investigate the root cause before proceeding.',
            priority: 'high',
        });
    }

    // Calculate overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (healthScore < 70) status = 'critical';
    else if (healthScore < 90) status = 'warning';

    return {
        experimentId: experiment.id,
        status,
        anomalies,
        recommendations,
        projections,
        healthScore: Math.max(0, healthScore),
    };
}

function calculateProjections(experiment: any, results: any[], currentSampleSize: number): Projection {
    const targetSampleSize = experiment.sample_size_target * 2;
    const primaryResults = results.filter(r => r.metric_name === experiment.primary_metric);

    if (primaryResults.length < 2 || currentSampleSize < 100) {
        return {
            daysToSignificance: null,
            projectedWinner: null,
            projectedLift: null,
            confidenceToReach95: 0,
        };
    }

    const controlResult = primaryResults.find(r => r.variant === 'control');
    const treatmentResult = primaryResults.find(r => r.variant === 'treatment');

    if (!controlResult || !treatmentResult) {
        return {
            daysToSignificance: null,
            projectedWinner: null,
            projectedLift: null,
            confidenceToReach95: 0,
        };
    }

    // Calculate projected lift
    const projectedLift = ((treatmentResult.mean_value - controlResult.mean_value) / controlResult.mean_value) * 100;

    // Estimate days to significance (simplified calculation)
    const progress = currentSampleSize / targetSampleSize;
    const startDate = experiment.start_date ? new Date(experiment.start_date) : new Date(experiment.created_at);
    const daysElapsed = Math.max(1, (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = currentSampleSize / daysElapsed;
    const remainingSamples = targetSampleSize - currentSampleSize;
    const daysToComplete = dailyRate > 0 ? Math.ceil(remainingSamples / dailyRate) : null;

    // Calculate confidence progression
    const currentPValue = treatmentResult.p_value || 1;
    const confidenceToReach95 = Math.min(100, (1 - currentPValue) * 100 * (progress < 0.5 ? progress * 2 : 1));

    return {
        daysToSignificance: daysToComplete,
        projectedWinner: projectedLift > 0 ? 'treatment' : projectedLift < 0 ? 'control' : 'inconclusive',
        projectedLift,
        confidenceToReach95,
    };
}
