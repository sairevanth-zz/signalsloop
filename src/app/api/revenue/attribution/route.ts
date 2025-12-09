/**
 * GET /api/revenue/attribution
 * 
 * Get revenue attribution for a feature
 * Query params:
 * - featureId: UUID (required)
 * - projectId: UUID (required)
 * 
 * POST /api/revenue/attribution
 * 
 * Calculate and store attribution for a feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateFeatureAttribution, storeAttribution } from '@/lib/revenue/attribution-service';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

const CalculateRequestSchema = z.object({
    projectId: z.string().uuid(),
    featureId: z.string().uuid(),
    shippedAt: z.string().datetime().optional()
});

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get('featureId');
    const projectId = searchParams.get('projectId');

    if (!featureId || !projectId) {
        return NextResponse.json(
            { error: 'featureId and projectId are required' },
            { status: 400 }
        );
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const { data, error } = await supabase
        .from('feature_revenue_attributions')
        .select('*')
        .eq('feature_id', featureId)
        .eq('project_id', projectId)
        .single();

    if (error) {
        return NextResponse.json(
            { success: false, attribution: null },
            { status: 200 }
        );
    }

    return NextResponse.json({
        success: true,
        attribution: data
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, featureId, shippedAt } = CalculateRequestSchema.parse(body);

        const result = await calculateFeatureAttribution({
            projectId,
            featureId,
            shippedAt: shippedAt ? new Date(shippedAt) : new Date()
        });

        if (result.success && result.attribution) {
            await storeAttribution(result.attribution);
        }

        return NextResponse.json({
            success: result.success,
            attribution: result.attribution,
            reasoning: result.reasoning
        });
    } catch (error) {
        console.error('[API] Revenue attribution error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to calculate attribution' },
            { status: 500 }
        );
    }
}
