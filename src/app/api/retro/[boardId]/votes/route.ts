/**
 * Votes API Route
 * POST /api/retro/[boardId]/votes - Toggle card vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { toggleCardVote } from '@/lib/retro';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { cardId } = body;

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
        }

        const result = await toggleCardVote(cardId, user.id);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error toggling vote:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
