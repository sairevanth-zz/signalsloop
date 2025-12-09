/**
 * POST /api/roadmap/adjustments/[id]/approve
 * 
 * Approves a roadmap adjustment proposal and applies changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyProposalChanges } from '@/lib/roadmap/proposal-generator';
import { createServerClient } from '@/lib/supabase-client';

const ApproveRequestSchema = z.object({
    notes: z.string().optional()
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: proposalId } = await params;
        const body = await request.json().catch(() => ({}));
        const { notes } = ApproveRequestSchema.parse(body);

        // Get current user
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Apply the proposal changes
        const result = await applyProposalChanges(proposalId, user.id, notes);

        return NextResponse.json({
            success: result.success,
            appliedChanges: result.appliedChanges.length,
            historyIds: result.historyIds,
            message: `Applied ${result.appliedChanges.length} priority changes`
        });
    } catch (error) {
        console.error('[API] Error approving proposal:', error);

        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { error: 'Proposal not found' },
                { status: 404 }
            );
        }

        if (error instanceof Error && error.message.includes('not pending')) {
            return NextResponse.json(
                { error: 'Proposal is not pending' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to approve proposal' },
            { status: 500 }
        );
    }
}
