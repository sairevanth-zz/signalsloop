/**
 * Tickets API
 * POST - Generate or execute ticket plan
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    generateTicketPlan,
    executeTicketPlan,
} from '@/lib/specs/spec-to-tickets-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, projectId, specId, plan } = body;

        if (!projectId) {
            return NextResponse.json(
                { success: false, error: 'projectId is required' },
                { status: 400 }
            );
        }

        // Generate ticket plan
        if (action === 'generate' || !action) {
            if (!specId) {
                return NextResponse.json(
                    { success: false, error: 'specId is required for generate action' },
                    { status: 400 }
                );
            }

            const result = await generateTicketPlan({ specId, projectId });
            return NextResponse.json(result);
        }

        // Execute ticket plan (create in Jira)
        if (action === 'execute') {
            if (!plan) {
                return NextResponse.json(
                    { success: false, error: 'plan is required for execute action' },
                    { status: 400 }
                );
            }

            const result = await executeTicketPlan({ projectId, plan });
            return NextResponse.json(result);
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error in POST /api/specs/tickets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process tickets request' },
            { status: 500 }
        );
    }
}
