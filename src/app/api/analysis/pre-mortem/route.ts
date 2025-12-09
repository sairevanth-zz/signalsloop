/**
 * POST /api/analysis/pre-mortem
 * 
 * Run pre-mortem analysis on a feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPreMortemAnalysis, storePreMortemAnalysis } from '@/lib/analysis/pre-mortem-service';

const RequestSchema = z.object({
    projectId: z.string().uuid(),
    featureName: z.string().min(1),
    featureDescription: z.string().min(1),
    specContent: z.string().optional(),
    targetSegment: z.string().optional(),
    estimatedEffort: z.string().optional()
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = RequestSchema.parse(body);

        const analysis = await runPreMortemAnalysis(data);
        await storePreMortemAnalysis(analysis);

        return NextResponse.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('[API] Pre-mortem error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Pre-mortem analysis failed' },
            { status: 500 }
        );
    }
}
