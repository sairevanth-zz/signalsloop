/**
 * Cleanup Worker
 * Recovers stale jobs from crashed workers
 * Triggered by cron every 5 minutes
 */

import { NextResponse } from 'next/server';
import { recoverStaleJobs } from '@/lib/hunters/job-queue';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function GET() {
    return POST();
}

export async function POST() {
    console.log('[Cleanup Worker] Starting...');

    try {
        const recoveredCount = await recoverStaleJobs();

        if (recoveredCount > 0) {
            console.log(`[Cleanup Worker] Recovered ${recoveredCount} stale jobs`);
        }

        return NextResponse.json({
            success: true,
            recovered: recoveredCount,
        });
    } catch (error) {
        console.error('[Cleanup Worker] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
