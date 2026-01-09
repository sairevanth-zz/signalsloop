/**
 * Scan Timeout API
 * Marks stale scans as failed to clean up stuck states
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { scanId } = body;

        if (!scanId) {
            return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 });
        }

        // Get the scan and verify ownership through project
        const { data: scan } = await supabase
            .from('hunter_scans')
            .select('id, project_id, status, started_at')
            .eq('id', scanId)
            .single();

        if (!scan) {
            return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
        }

        // Verify ownership
        const { data: project } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', scan.project_id)
            .single();

        if (!project || project.owner_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Only timeout scans that are still "running"
        if (scan.status !== 'running') {
            return NextResponse.json({ success: true, message: 'Scan already completed' });
        }

        // Verify the scan is actually stale (> 1 hour old)
        const startedAt = new Date(scan.started_at).getTime();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (startedAt > oneHourAgo) {
            return NextResponse.json({ success: false, error: 'Scan is not stale yet' }, { status: 400 });
        }

        // Mark the scan as failed due to timeout
        const { error: updateError } = await supabase
            .from('hunter_scans')
            .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                error: 'Scan timed out after 1 hour',
            })
            .eq('id', scanId);

        if (updateError) {
            console.error('[Scan Timeout] Error updating scan:', updateError);
            return NextResponse.json({ success: false, error: 'Failed to timeout scan' }, { status: 500 });
        }

        console.log('[Scan Timeout] Marked stale scan as failed:', scanId);

        return NextResponse.json({
            success: true,
            message: 'Scan marked as timed out',
        });
    } catch (error) {
        console.error('[Scan Timeout] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to timeout scan' },
            { status: 500 }
        );
    }
}
