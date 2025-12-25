/**
 * Public Retro Comments API
 * Allows anonymous users to comment on cards in shared retrospectives
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const supabase = getSupabaseServiceRoleClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Server error' }, { status: 500 });
        }

        const { token } = await params;

        // Verify board exists and is public
        const { data: board, error: boardError } = await supabase
            .from('retro_boards')
            .select('id')
            .eq('share_token', token)
            .eq('is_public', true)
            .single();

        if (boardError || !board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        const body = await request.json();
        const { cardId, comment, participant_name } = body;

        if (!cardId || !comment) {
            return NextResponse.json({ error: 'Card ID and comment required' }, { status: 400 });
        }

        // Create the comment
        const { data: newComment, error } = await supabase
            .from('retro_card_comments')
            .insert({
                card_id: cardId,
                text: comment,
                author: participant_name || 'Anonymous',
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding comment:', error);
            return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
        }

        return NextResponse.json({ comment: newComment });
    } catch (error) {
        console.error('Public comments API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
