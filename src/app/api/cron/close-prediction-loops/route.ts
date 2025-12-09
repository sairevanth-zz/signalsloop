/**
 * Cron Job: Close Prediction Loops
 * 
 * GET /api/cron/close-prediction-loops
 * 
 * Schedule: Every 12 hours (runs after outcomes are classified)
 */

import { NextRequest, NextResponse } from 'next/server';
import { closeAllEligibleLoops } from '@/lib/predictions/loop-closure';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('[Cron] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting prediction loop closure');

    try {
        const result = await closeAllEligibleLoops();

        console.log(`[Cron] Loop closure complete: ${result.closed} closed, ${result.failed} failed, ${result.skipped} skipped`);

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[Cron] Loop closure error:', error);
        return NextResponse.json(
            { error: 'Loop closure failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
