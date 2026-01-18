/**
 * Experiment Decision API
 *
 * GET /api/experiments/decide - Get variant for a visitor
 * Used by the JavaScript SDK to determine which variant to show
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'edge'; // Use edge runtime for low latency

interface DecideRequest {
    experimentId?: string;
    experimentKey?: string;
    visitorId: string;
    userId?: string;
    context?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    try {
        const body: DecideRequest = await request.json();
        const { experimentId, experimentKey, visitorId, userId, context } = body;

        if (!visitorId) {
            return NextResponse.json(
                { error: 'visitorId is required' },
                { status: 400 }
            );
        }

        if (!experimentId && !experimentKey) {
            return NextResponse.json(
                { error: 'Either experimentId or experimentKey is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Get the experiment
        let experimentQuery = supabase.from('experiments').select('*');
        if (experimentId) {
            experimentQuery = experimentQuery.eq('id', experimentId);
        } else if (experimentKey) {
            experimentQuery = experimentQuery.eq('name', experimentKey);
        }

        const { data: experiment, error: expError } = await experimentQuery.single();

        if (expError || !experiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404 }
            );
        }

        // Check if experiment is running
        if (experiment.status !== 'running') {
            return NextResponse.json({
                experimentId: experiment.id,
                enabled: false,
                reason: 'Experiment is not running',
                variant: null,
            });
        }

        // Check traffic allocation
        const randomValue = Math.random() * 100;
        if (randomValue > (experiment.traffic_allocation || 100)) {
            return NextResponse.json({
                experimentId: experiment.id,
                enabled: false,
                reason: 'Not in experiment traffic',
                variant: null,
            });
        }

        // Check for existing assignment
        const { data: existingAssignment } = await supabase
            .from('experiment_assignments')
            .select('*, experiment_variants(*)')
            .eq('experiment_id', experiment.id)
            .eq('visitor_id', visitorId)
            .single();

        if (existingAssignment) {
            return NextResponse.json({
                experimentId: experiment.id,
                enabled: true,
                variant: {
                    id: existingAssignment.experiment_variants.id,
                    key: existingAssignment.experiment_variants.variant_key,
                    name: existingAssignment.experiment_variants.name,
                    config: existingAssignment.experiment_variants.config,
                },
                isNewAssignment: false,
            });
        }

        // Get all variants for this experiment
        const { data: variants, error: varError } = await supabase
            .from('experiment_variants')
            .select('*')
            .eq('experiment_id', experiment.id)
            .order('variant_key');

        if (varError || !variants || variants.length === 0) {
            return NextResponse.json(
                { error: 'No variants configured for experiment' },
                { status: 500 }
            );
        }

        // Assign variant based on traffic percentage
        const variantRandom = Math.random() * 100;
        let cumulative = 0;
        let selectedVariant = variants[0];

        for (const variant of variants) {
            cumulative += variant.traffic_percentage;
            if (variantRandom <= cumulative) {
                selectedVariant = variant;
                break;
            }
        }

        // Create assignment
        const { error: assignError } = await supabase
            .from('experiment_assignments')
            .insert({
                experiment_id: experiment.id,
                variant_id: selectedVariant.id,
                visitor_id: visitorId,
                user_id: userId || null,
                context: context || {},
            });

        if (assignError) {
            console.error('[Experiments Decide] Assignment error:', assignError);
            // Continue anyway, assignment is not critical for serving variant
        }

        return NextResponse.json({
            experimentId: experiment.id,
            enabled: true,
            variant: {
                id: selectedVariant.id,
                key: selectedVariant.variant_key,
                name: selectedVariant.name,
                config: selectedVariant.config,
            },
            isNewAssignment: true,
        });

    } catch (error) {
        console.error('[Experiments Decide] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint for simple variant checks
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');
    const experimentKey = searchParams.get('experimentKey');
    const visitorId = searchParams.get('visitorId');

    if (!visitorId) {
        return NextResponse.json(
            { error: 'visitorId query parameter is required' },
            { status: 400 }
        );
    }

    // Redirect to POST for processing
    return POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({
            experimentId,
            experimentKey,
            visitorId,
        }),
    }));
}
