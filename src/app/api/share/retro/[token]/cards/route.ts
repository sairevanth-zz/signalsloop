/**
 * Public Retro Cards API
 * Allows anonymous users to add cards to shared retrospectives
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
        const { column_id, content, participant_name } = body;

        if (!column_id || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create the card
        const { data: card, error } = await supabase
            .from('retro_cards')
            .insert({
                column_id,
                content,
                is_ai: false,
                source: `Public: ${participant_name || 'Anonymous'}`,
                vote_count: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating card:', error);
            return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
        }

        return NextResponse.json({ card });
    } catch (error) {
        console.error('Public cards API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
