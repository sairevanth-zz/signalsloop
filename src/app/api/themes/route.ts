/**
 * Themes API
 * 
 * GET /api/themes - Get all themes for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/themes
 * Get all themes for a project
 * 
 * Query params:
 *   - projectId: string (required)
 *   - limit: number (default: 50)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database connection not available' },
                { status: 500 }
            );
        }

        // Fetch themes for the project
        const { data: themes, error } = await supabase
            .from('themes')
            .select('*')
            .eq('project_id', projectId)
            .order('frequency', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Themes API] Error fetching themes:', error);
            return NextResponse.json(
                { error: 'Failed to fetch themes' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            themes: themes || [],
            count: themes?.length || 0,
        });

    } catch (error) {
        console.error('[Themes API] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch themes',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
