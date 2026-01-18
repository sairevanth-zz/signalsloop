/**
 * Experiment Variants API
 *
 * GET /api/experiments/[id]/variants - Get variants for an experiment
 * POST /api/experiments/[id]/variants - Create variant for experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

interface RouteContext {
    params: Promise<{ id: string }>;
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

        const { data: variants, error } = await supabase
            .from('experiment_variants')
            .select('*')
            .eq('experiment_id', experimentId)
            .order('variant_key');

        if (error) {
            console.error('[Variants API] Error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ variants: variants || [] });

    } catch (error) {
        console.error('[Variants API] GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: experimentId } = await context.params;
        const body = await request.json();
        const {
            name,
            variantKey,
            description,
            config = {},
            trafficPercentage = 50,
            isControl = false
        } = body;

        if (!name || !variantKey) {
            return NextResponse.json(
                { error: 'name and variantKey are required' },
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

        const { data: variant, error } = await supabase
            .from('experiment_variants')
            .insert({
                experiment_id: experimentId,
                name,
                variant_key: variantKey,
                description,
                config,
                traffic_percentage: trafficPercentage,
                is_control: isControl,
            })
            .select()
            .single();

        if (error) {
            console.error('[Variants API] Error creating variant:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ variant }, { status: 201 });

    } catch (error) {
        console.error('[Variants API] POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
