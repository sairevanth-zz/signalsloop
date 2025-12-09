/**
 * POST /api/roadmap/adjustments/[id]/reject
 * 
 * Rejects a roadmap adjustment proposal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rejectProposal } from '@/lib/roadmap/proposal-generator';
import { createServerClient } from '@/lib/supabase-client';

const RejectRequestSchema = z.object({
    notes: z.string().optional()
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: proposalId } = await params;
        const body = await request.json().catch(() => ({}));
        const { notes } = RejectRequestSchema.parse(body);

        // Get current user
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Reject the proposal
        await rejectProposal(proposalId, user.id, notes);

        return NextResponse.json({
            success: true,
            message: 'Proposal rejected'
        });
    } catch (error) {
        console.error('[API] Error rejecting proposal:', error);

        return NextResponse.json(
            { error: 'Failed to reject proposal' },
            { status: 500 }
        );
    }
}
