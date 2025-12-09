/**
 * GET /api/themes/correlations
 * 
 * Get theme correlation analysis for a project
 * Query params:
 * - projectId: UUID (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorrelationAnalysis } from '@/lib/themes/correlation-service';

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
        const analysis = await getCorrelationAnalysis(projectId);

        return NextResponse.json({
            success: true,
            network: analysis.network,
            correlations: analysis.correlations,
            insights: analysis.insights,
            analyzedAt: analysis.analyzedAt
        });
    } catch (error) {
        console.error('[API] Theme correlation error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze correlations' },
            { status: 500 }
        );
    }
}
