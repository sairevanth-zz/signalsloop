/**
 * Hunter Status API
 * Returns current scan status for frontend polling/realtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScan, getScanJobs } from '@/lib/hunters/job-queue';
import { createServerClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const scanId = searchParams.get('scanId');
    const projectId = searchParams.get('projectId');

    if (!scanId && !projectId) {
        return NextResponse.json({ error: 'scanId or projectId required' }, { status: 400 });
    }

    try {
        const supabase = await createServerClient();

        // If projectId provided, get latest scan
        let targetScanId = scanId;
        if (!targetScanId && projectId) {
            const { data: latestScan } = await supabase
                .from('hunter_scans')
                .select('id')
                .eq('project_id', projectId)
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

            targetScanId = latestScan?.id;
        }

        if (!targetScanId) {
            return NextResponse.json({ scan: null, message: 'No scans found' });
        }

        // Get scan and jobs
        const scan = await getScan(targetScanId);
        const jobs = await getScanJobs(targetScanId);

        if (!scan) {
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }

        // Calculate per-platform status
        const platformStatus = Object.entries(scan.platforms).map(([platform, status]) => {
            const platformJobs = jobs.filter(j => j.platform === platform);
            const latestJob = platformJobs[platformJobs.length - 1];

            return {
                platform,
                status: status as string,
                jobType: latestJob?.job_type,
                attempts: latestJob?.attempts || 0,
                error: latestJob?.error,
            };
        });

        // Calculate overall progress
        const completedPlatforms = platformStatus.filter(p =>
            p.status === 'complete' || p.status === 'failed'
        ).length;
        const totalPlatforms = platformStatus.length;
        const progress = totalPlatforms > 0 ? (completedPlatforms / totalPlatforms) * 100 : 0;

        return NextResponse.json({
            scan: {
                id: scan.id,
                status: scan.status,
                totalDiscovered: scan.total_discovered,
                totalRelevant: scan.total_relevant,
                totalClassified: scan.total_classified,
                startedAt: scan.started_at,
                completedAt: scan.completed_at,
            },
            platforms: platformStatus,
            progress,
            allComplete: scan.status !== 'running',
        });
    } catch (error) {
        console.error('[Hunter Status] Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
