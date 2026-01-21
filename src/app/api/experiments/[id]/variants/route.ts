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

// PATCH - Update visual changes for a specific variant
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id: experimentId } = await context.params;
        const body = await request.json();
        const { variant_key, visual_changes, page_url } = body;

        if (!variant_key) {
            return NextResponse.json(
                { error: 'variant_key is required' },
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

        // First check if variant exists, if not create it
        const { data: existing } = await supabase
            .from('experiment_variants')
            .select('id')
            .eq('experiment_id', experimentId)
            .eq('variant_key', variant_key)
            .single();

        if (!existing) {
            // Create the variant first
            const { error: insertError } = await supabase
                .from('experiment_variants')
                .insert({
                    experiment_id: experimentId,
                    name: variant_key,
                    variant_key: variant_key,
                    traffic_percentage: 50,
                    is_control: variant_key === 'control',
                    visual_changes: visual_changes || [],
                    page_url: page_url,
                });

            if (insertError) {
                console.error('[Variants API] Error creating variant:', insertError);
                return NextResponse.json(
                    { error: insertError.message },
                    { status: 500 }
                );
            }
        } else {
            // Update existing variant
            const { error: updateError } = await supabase
                .from('experiment_variants')
                .update({
                    visual_changes: visual_changes || [],
                    page_url: page_url,
                    updated_at: new Date().toISOString(),
                })
                .eq('experiment_id', experimentId)
                .eq('variant_key', variant_key);

            if (updateError) {
                console.error('[Variants API] Error updating variant:', updateError);
                return NextResponse.json(
                    { error: updateError.message },
                    { status: 500 }
                );
            }
        }

        // Fetch the updated variant
        const { data: variant, error } = await supabase
            .from('experiment_variants')
            .select('*')
            .eq('experiment_id', experimentId)
            .eq('variant_key', variant_key)
            .single();

        if (error) {
            console.error('[Variants API] Error fetching updated variant:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            variant,
            message: `Saved ${(visual_changes || []).length} visual changes`,
        });

    } catch (error) {
        console.error('[Variants API] PATCH error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
