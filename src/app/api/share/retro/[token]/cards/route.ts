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
            console.error('Supabase service role client not available');
            return NextResponse.json({ error: 'Server error' }, { status: 500 });
        }

        const { token } = await params;
        console.log('Public card add request for token:', token);

        // Verify board exists and is public
        const { data: board, error: boardError } = await supabase
            .from('retro_boards')
            .select('id')
            .eq('share_token', token)
            .eq('is_public', true)
            .single();

        if (boardError || !board) {
            console.error('Board lookup error:', boardError);
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        const body = await request.json();
        const { column_id, content, participant_name } = body;

        if (!column_id || !content) {
            console.error('Missing fields:', { column_id, content });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create the card with all fields
        const { data: card, error } = await supabase
            .from('retro_cards')
            .insert({
                column_id,
                content: content.trim(),
                is_ai: false,
                source: `Public: ${participant_name || 'Anonymous'}`,
                data_badge: null,
                is_success: false,
                is_alert: false,
                vote_count: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating card:', error);
            return NextResponse.json({ error: 'Failed to create card', details: error.message }, { status: 500 });
        }

        console.log('Card created successfully:', card.id);
        return NextResponse.json({ card });
    } catch (error) {
        console.error('Public cards API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

