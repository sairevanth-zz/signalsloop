/**
 * Feedback Review API
 * Handle human review of items flagged as needs_review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

/**
 * POST /api/hunter/feedback/review
 * Mark a feedback item as relevant or irrelevant
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id, decision } = await request.json();

        if (!id || !decision) {
            return NextResponse.json(
                { success: false, error: 'id and decision are required' },
                { status: 400 }
            );
        }

        if (!['relevant', 'irrelevant'].includes(decision)) {
            return NextResponse.json(
                { success: false, error: 'decision must be "relevant" or "irrelevant"' },
                { status: 400 }
            );
        }

        // Update the feedback item
        const updateData: Record<string, unknown> = {
            needs_review: false,
            updated_at: new Date().toISOString(),
        };

        if (decision === 'irrelevant') {
            // Archive irrelevant items
            updateData.is_archived = true;
            updateData.relevance_score = 0;
        } else {
            // Mark as definitely relevant
            updateData.relevance_score = 100;
        }

        const { error } = await supabase
            .from('discovered_feedback')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('[Review API] Error updating feedback:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to update feedback' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Feedback marked as ${decision}`,
        });
    } catch (error) {
        console.error('[Review API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process review' },
            { status: 500 }
        );
    }
}
