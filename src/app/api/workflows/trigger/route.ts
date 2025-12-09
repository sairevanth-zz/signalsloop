/**
 * POST /api/workflows/trigger
 * 
 * Trigger a workflow based on an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { triggerWorkflow } from '@/lib/agents/workflow-orchestrator';
import type { WorkflowTrigger } from '@/types/agent-workflow';

const RequestSchema = z.object({
    projectId: z.string().uuid(),
    trigger: z.enum([
        'new_feedback',
        'theme_spike',
        'sentiment_shift',
        'feature_shipped',
        'competitor_detected',
        'churn_signal',
        'spec_created',
        'manual'
    ]),
    data: z.record(z.unknown()).optional()
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, trigger, data } = RequestSchema.parse(body);

        const result = await triggerWorkflow(
            projectId,
            trigger as WorkflowTrigger,
            data || {}
        );

        if (!result) {
            return NextResponse.json({
                success: false,
                message: `No workflow template found for trigger: ${trigger}`
            });
        }

        return NextResponse.json({
            success: result.success,
            workflowId: result.workflowId,
            stepsCompleted: result.stepsCompleted,
            totalSteps: result.totalSteps,
            durationMs: result.durationMs
        });
    } catch (error) {
        console.error('[API] Workflow trigger error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Workflow trigger failed' },
            { status: 500 }
        );
    }
}
