/**
 * Feature Flag CRUD API
 *
 * GET/PATCH/DELETE /api/feature-flags/[id] - Manage a specific flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id: flagId } = await context.params;

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        const { data: flag, error } = await supabase
            .from('feature_flags')
            .select('*')
            .eq('id', flagId)
            .single();

        if (error || !flag) {
            return NextResponse.json(
                { error: 'Flag not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ flag });

    } catch (error) {
        console.error('[Feature Flags API] GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id: flagId } = await context.params;
        const body = await request.json();
        const {
            name,
            description,
            isEnabled,
            defaultValue,
            rolloutPercentage,
            targetingRules,
            scheduledStart,
            scheduledEnd,
            tags,
        } = body;

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        // Build update object
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (isEnabled !== undefined) updates.is_enabled = isEnabled;
        if (defaultValue !== undefined) updates.default_value = JSON.stringify(defaultValue);
        if (rolloutPercentage !== undefined) updates.rollout_percentage = rolloutPercentage;
        if (targetingRules !== undefined) updates.targeting_rules = targetingRules;
        if (scheduledStart !== undefined) updates.scheduled_start = scheduledStart;
        if (scheduledEnd !== undefined) updates.scheduled_end = scheduledEnd;
        if (tags !== undefined) updates.tags = tags;

        const { data: flag, error } = await supabase
            .from('feature_flags')
            .update(updates)
            .eq('id', flagId)
            .select()
            .single();

        if (error) {
            console.error('[Feature Flags API] Error updating flag:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        // Log history
        await supabase.from('feature_flag_history').insert({
            flag_id: flagId,
            action: isEnabled !== undefined ? (isEnabled ? 'enabled' : 'disabled') : 'updated',
            new_value: updates,
        });

        return NextResponse.json({ flag });

    } catch (error) {
        console.error('[Feature Flags API] PATCH error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id: flagId } = await context.params;

        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database client not available' },
                { status: 500 }
            );
        }

        const { error } = await supabase
            .from('feature_flags')
            .delete()
            .eq('id', flagId);

        if (error) {
            console.error('[Feature Flags API] Error deleting flag:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Feature Flags API] DELETE error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
