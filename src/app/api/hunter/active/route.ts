/**
 * Get Active Scan API
 * Returns the most recent running scan for a project
 * Used to restore progress bar when navigating back to Hunter page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
        }

        // Verify user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', projectId)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Get most recent running or recent scan (within last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data: activeScan } = await supabase
            .from('hunter_scans')
            .select('*')
            .eq('project_id', projectId)
            .or(`status.eq.running,and(status.neq.cancelled,started_at.gte.${oneHourAgo})`)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        if (!activeScan) {
            return NextResponse.json({ success: true, activeScan: null });
        }

        return NextResponse.json({
            success: true,
            activeScan: {
                id: activeScan.id,
                status: activeScan.status,
                platforms: activeScan.platforms,
                totalDiscovered: activeScan.total_discovered,
                totalRelevant: activeScan.total_relevant,
                totalClassified: activeScan.total_classified,
                startedAt: activeScan.started_at,
                completedAt: activeScan.completed_at,
            },
        });
    } catch (error) {
        console.error('[Hunter Active] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get active scan' },
            { status: 500 }
        );
    }
}
