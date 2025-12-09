/**
 * POST /api/roadmap/adjustments/detect
 * 
 * Detects if roadmap adjustments are needed based on:
 * - Sentiment shifts (>15% change)
 * - Competitor moves (new threats detected)
 * - Theme spikes (velocity increase)
 * - Churn signals (from churn-radar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { detectRoadmapAdjustmentTriggers } from '@/lib/roadmap/trigger-detection';
import { generateAdjustmentProposal } from '@/lib/roadmap/proposal-generator';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

const DetectRequestSchema = z.object({
    projectId: z.string().uuid()
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId } = DetectRequestSchema.parse(body);

        console.log(`[API] Detecting adjustments for project ${projectId}`);

        // 1. Detect triggers
        const triggers = await detectRoadmapAdjustmentTriggers(projectId);

        if (triggers.length === 0) {
            return NextResponse.json({
                adjustmentsNeeded: false,
                triggers: [],
                proposalsCreated: 0
            });
        }

        // 2. Generate proposals for significant triggers (medium, high, critical)
        const significantTriggers = triggers.filter(t => t.severity !== 'low');
        const proposals = [];
        const supabase = getServiceRoleClient();

        for (const trigger of significantTriggers) {
            try {
                const proposal = await generateAdjustmentProposal(projectId, trigger);

                // Store proposal in database
                const { data, error } = await supabase
                    .from('roadmap_adjustment_proposals')
                    .insert(proposal)
                    .select('id')
                    .single();

                if (!error && data) {
                    proposals.push({ id: data.id, trigger: trigger.type });
                }
            } catch (error) {
                console.error(`[API] Failed to generate proposal for trigger:`, error);
            }
        }

        console.log(`[API] Created ${proposals.length} proposals from ${triggers.length} triggers`);

        return NextResponse.json({
            adjustmentsNeeded: true,
            triggers: triggers.map(t => ({
                type: t.type,
                severity: t.severity,
                themeName: t.themeName,
                description: t.description
            })),
            proposalsCreated: proposals.length
        });
    } catch (error) {
        console.error('[API] Error detecting adjustments:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
