/**
 * Public Retro Votes API
 * Allows anonymous users to vote on cards in shared retrospectives
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
        const { cardId } = body;

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
        }

        // Get current vote count
        const { data: card } = await supabase
            .from('retro_cards')
            .select('vote_count')
            .eq('id', cardId)
            .single();

        const newCount = (card?.vote_count || 0) + 1;

        // Increment vote count
        const { error } = await supabase
            .from('retro_cards')
            .update({ vote_count: newCount })
            .eq('id', cardId);

        if (error) {
            console.error('Error voting:', error);
            return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
        }

        return NextResponse.json({ newCount });
    } catch (error) {
        console.error('Public votes API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
