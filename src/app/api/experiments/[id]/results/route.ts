/**
 * Experiment Results API
 *
 * GET /api/experiments/[id]/results - Get real-time results for an experiment
 * Now with Bayesian statistics for probability to beat control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { computeBayesianResults } from '@/lib/experiments/bayesian-stats';

export const runtime = 'nodejs';

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface VariantResult {
    variantId: string;
    variantKey: string;
    variantName: string;
    isControl: boolean;
    visitors: number;
    conversions: number;
    conversionRate: number;
    lift: number | null;
    confidence: number;
    isWinner: boolean;
    isSignificant: boolean;
}

interface ExperimentResults {
    experimentId: string;
    experimentName: string;
    status: string;
    startDate: string | null;
    totalVisitors: number;
    totalConversions: number;
    variants: VariantResult[];
    hasSignificantWinner: boolean;
    recommendedAction: 'continue' | 'stop_winner' | 'stop_loser' | 'needs_more_data';
    daysRunning: number;
    projectedDaysToSignificance: number | null;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id: experimentId } = await context.params;

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Get experiment details
        const { data: experiment, error: expError } = await supabase
            .from('experiments')
            .select('*')
            .eq('id', experimentId)
            .single();

        if (expError || !experiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404 }
            );
        }

        // Get variants with their stats
        const { data: variants, error: varError } = await supabase
            .from('experiment_variants')
            .select('*')
            .eq('experiment_id', experimentId)
            .order('variant_key');

        if (varError) {
            return NextResponse.json(
                { error: 'Failed to fetch variants' },
                { status: 500 }
            );
        }

        // Get assignments count per variant
        const { data: assignmentCounts } = await supabase
            .from('experiment_assignments')
            .select('variant_id')
            .eq('experiment_id', experimentId);

        // Get conversion events per variant
        const { data: conversionEvents } = await supabase
            .from('experiment_events')
            .select('variant_id')
            .eq('experiment_id', experimentId)
            .eq('event_type', 'conversion');

        // Calculate results per variant using Bayesian statistics
        const variantDataForBayes = (variants || []).map(variant => {
            const visitors = (assignmentCounts || []).filter(a => a.variant_id === variant.id).length;
            const conversions = (conversionEvents || []).filter(e => e.variant_id === variant.id).length;
            return {
                key: variant.variant_key,
                visitors,
                conversions,
                isControl: variant.is_control || false,
                variantId: variant.id,
                variantName: variant.name,
            };
        });

        // Compute Bayesian results
        const bayesianResults = computeBayesianResults(
            variantDataForBayes.map(v => ({
                key: v.key,
                visitors: v.visitors,
                conversions: v.conversions,
                isControl: v.isControl,
            }))
        );

        // Map Bayesian results to variant results
        const variantResults: VariantResult[] = variantDataForBayes.map(variant => {
            const bayesian = bayesianResults.find(b => b.variantKey === variant.key);
            const controlResult = bayesianResults.find(b =>
                variantDataForBayes.find(v => v.key === b.variantKey)?.isControl
            );

            // Calculate lift relative to control
            let lift: number | null = null;
            if (!variant.isControl && controlResult && controlResult.conversionRate > 0) {
                lift = ((bayesian?.conversionRate || 0) - controlResult.conversionRate) / controlResult.conversionRate * 100;
            }

            return {
                variantId: variant.variantId,
                variantKey: variant.key,
                variantName: variant.variantName,
                isControl: variant.isControl,
                visitors: variant.visitors,
                conversions: variant.conversions,
                conversionRate: (bayesian?.conversionRate || 0) * 100,
                lift,
                confidence: (bayesian?.probabilityToBeatControl || 0) * 100, // Bayesian probability
                probabilityToBeatControl: bayesian?.probabilityToBeatControl || 0,
                credibleInterval: {
                    low: (bayesian?.credibleIntervalLow || 0) * 100,
                    high: (bayesian?.credibleIntervalHigh || 0) * 100,
                },
                expectedLoss: (bayesian?.expectedLoss || 0) * 100,
                isWinner: bayesian?.isWinner || false,
                isSignificant: bayesian?.isSignificant || false,
            };
        });

        // Calculate summary stats
        const totalVisitors = variantResults.reduce((sum, v) => sum + v.visitors, 0);
        const totalConversions = variantResults.reduce((sum, v) => sum + v.conversions, 0);
        const hasSignificantWinner = variantResults.some(v => v.isWinner);

        // Calculate days running
        const startDate = experiment.start_date ? new Date(experiment.start_date) : null;
        const daysRunning = startDate ? Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        // Determine recommended action
        let recommendedAction: 'continue' | 'stop_winner' | 'stop_loser' | 'needs_more_data' = 'needs_more_data';
        if (hasSignificantWinner) {
            recommendedAction = 'stop_winner';
        } else if (totalVisitors >= (experiment.sample_size_target || 1000) * 2) {
            recommendedAction = 'stop_loser';
        } else if (totalVisitors >= 100) {
            recommendedAction = 'continue';
        }

        // Project days to significance
        let projectedDaysToSignificance: number | null = null;
        if (totalVisitors > 0 && daysRunning > 0) {
            const dailyVisitors = totalVisitors / daysRunning;
            const targetSample = experiment.sample_size_target || 1000;
            const remainingSamples = Math.max(0, targetSample - totalVisitors);
            projectedDaysToSignificance = Math.ceil(remainingSamples / dailyVisitors);
        }

        const results: ExperimentResults = {
            experimentId: experiment.id,
            experimentName: experiment.name,
            status: experiment.status,
            startDate: experiment.start_date,
            totalVisitors,
            totalConversions,
            variants: variantResults,
            hasSignificantWinner,
            recommendedAction,
            daysRunning,
            projectedDaysToSignificance,
        };

        return NextResponse.json(results);

    } catch (error) {
        console.error('[Results API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
