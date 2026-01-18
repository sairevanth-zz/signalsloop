/**
 * Update Experiment Variant API
 * 
 * PATCH /api/experiments/[id]/variants/[variantId] - Update a variant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

interface RouteContext {
    params: Promise<{ id: string; variantId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id: experimentId, variantId } = await context.params;
        const body = await request.json();
        const { name, description, config, trafficPercentage } = body;

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Build update object with only provided fields
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (config !== undefined) updates.config = config;
        if (trafficPercentage !== undefined) updates.traffic_percentage = trafficPercentage;

        const { data: variant, error } = await supabase
            .from('experiment_variants')
            .update(updates)
            .eq('id', variantId)
            .eq('experiment_id', experimentId)
            .select()
            .single();

        if (error) {
            console.error('[Variants API] Error updating variant:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ variant });

    } catch (error) {
        console.error('[Variants API] PATCH error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id: experimentId, variantId } = await context.params;

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        const { error } = await supabase
            .from('experiment_variants')
            .delete()
            .eq('id', variantId)
            .eq('experiment_id', experimentId);

        if (error) {
            console.error('[Variants API] Error deleting variant:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Variants API] DELETE error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
