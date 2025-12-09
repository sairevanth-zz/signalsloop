/**
 * GET /api/predictions/accuracy
 * 
 * Get prediction accuracy dashboard data
 * Query params:
 * - projectId: UUID (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccuracyDashboardData } from '@/lib/predictions/accuracy-service';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json(
            { error: 'projectId is required' },
            { status: 400 }
        );
    }

    try {
        const data = await getAccuracyDashboardData(projectId);

        return NextResponse.json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error('[API] Accuracy dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to get accuracy data' },
            { status: 500 }
        );
    }
}
