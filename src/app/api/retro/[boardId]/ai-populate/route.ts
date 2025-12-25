/**
 * AI Populate API Route
 * POST /api/retro/[boardId]/ai-populate - Trigger AI population for the board
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getRetroBoard, updateRetroBoard } from '@/lib/retro/retro-board-service';
import { populateRetroFromOutcomes } from '@/lib/retro/ai-population';

interface RouteParams {
    params: Promise<{ boardId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { boardId } = await params;

        // Get the board
        const board = await getRetroBoard(boardId);
        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        // Populate from outcomes
        const result = await populateRetroFromOutcomes(
            boardId,
            board.project_id,
            board.period_type,
            board.start_date,
            board.end_date
        );

        // Update board metrics
        if (result.metrics.length > 0) {
            await updateRetroBoard(boardId, { metrics: result.metrics });
        }

        return NextResponse.json({
            success: true,
            cards: result.cards,
            metrics: result.metrics,
        });
    } catch (error) {
        console.error('Error populating retro board with AI:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
