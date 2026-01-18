/**
 * Experiment Results API
 *
 * GET /api/experiments/[id]/results - Get real-time results for an experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

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

        // Calculate results per variant
        const variantResults: VariantResult[] = (variants || []).map(variant => {
            const visitors = (assignmentCounts || []).filter(a => a.variant_id === variant.id).length;
            const conversions = (conversionEvents || []).filter(e => e.variant_id === variant.id).length;
            const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;

            return {
                variantId: variant.id,
                variantKey: variant.variant_key,
                variantName: variant.name,
                isControl: variant.is_control,
                visitors,
                conversions,
                conversionRate,
                lift: null, // Calculated below
                confidence: 0, // Calculated below
                isWinner: false,
                isSignificant: false,
            };
        });

        // Calculate lift and confidence relative to control
        const controlVariant = variantResults.find(v => v.isControl);
        if (controlVariant) {
            variantResults.forEach(variant => {
                if (!variant.isControl && controlVariant.conversionRate > 0) {
                    variant.lift = ((variant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100;

                    // Simple confidence calculation based on sample size
                    const minSamples = Math.min(variant.visitors, controlVariant.visitors);
                    if (minSamples >= 100) {
                        // Z-test approximation
                        const p1 = variant.conversionRate / 100;
                        const p2 = controlVariant.conversionRate / 100;
                        const pooled = (variant.conversions + controlVariant.conversions) /
                            (variant.visitors + controlVariant.visitors);
                        const se = Math.sqrt(pooled * (1 - pooled) * (1 / variant.visitors + 1 / controlVariant.visitors));
                        const z = se > 0 ? Math.abs(p1 - p2) / se : 0;

                        // Convert z-score to confidence percentage (simplified)
                        variant.confidence = Math.min(99.9, Math.max(0, (1 - Math.exp(-z * 0.7)) * 100));
                        variant.isSignificant = variant.confidence >= 95;
                    }
                }
            });

            // Determine winner
            const significantVariants = variantResults.filter(v => v.isSignificant && v.lift !== null && v.lift > 0);
            if (significantVariants.length > 0) {
                const winner = significantVariants.reduce((a, b) => (a.lift || 0) > (b.lift || 0) ? a : b);
                winner.isWinner = true;
            }
        }

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
