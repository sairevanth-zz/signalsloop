/**
 * GET /api/predictions/calibration
 * 
 * Get confidence calibration data for a project
 * Query params:
 * - projectId: UUID (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalibrationDashboardData } from '@/lib/predictions/calibration-service';

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
        const data = await getCalibrationDashboardData(projectId);

        return NextResponse.json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error('[API] Calibration error:', error);
        return NextResponse.json(
            { error: 'Failed to get calibration data' },
            { status: 500 }
        );
    }
}
