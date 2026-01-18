/**
 * Feature Flags API
 *
 * GET /api/feature-flags - List flags for a project
 * POST /api/feature-flags - Create a new feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
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

        const { data: flags, error } = await supabase
            .from('feature_flags')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Feature Flags API] Error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ flags: flags || [] });

    } catch (error) {
        console.error('[Feature Flags API] GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            projectId,
            name,
            key,
            description,
            flagType = 'boolean',
            defaultValue = false,
            isEnabled = false,
            rolloutPercentage = 100,
            targetingRules = [],
            tags = [],
        } = body;

        if (!projectId || !name || !key) {
            return NextResponse.json(
                { error: 'projectId, name, and key are required' },
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

        const { data: flag, error } = await supabase
            .from('feature_flags')
            .insert({
                project_id: projectId,
                name,
                key,
                description,
                flag_type: flagType,
                default_value: JSON.stringify(defaultValue),
                is_enabled: isEnabled,
                rollout_percentage: rolloutPercentage,
                targeting_rules: targetingRules,
                tags,
            })
            .select()
            .single();

        if (error) {
            console.error('[Feature Flags API] Error creating flag:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ flag }, { status: 201 });

    } catch (error) {
        console.error('[Feature Flags API] POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
