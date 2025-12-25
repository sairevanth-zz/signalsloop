/**
 * Summary API Route
 * POST /api/retro/[boardId]/summary - Generate AI summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getRetroBoard, updateRetroBoard } from '@/lib/retro/retro-board-service';
import { generateAISummary } from '@/lib/retro/ai-population';

interface RouteParams {
    params: Promise<{ boardId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { boardId } = await params;

        // Get the board with details
        const board = await getRetroBoard(boardId);
        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        // Generate summary
        const summary = await generateAISummary(
            {
                title: board.title,
                period_type: board.period_type,
                start_date: board.start_date,
                end_date: board.end_date,
            },
            board.columns.map(col => ({
                title: col.title,
                cards: col.cards.map(card => ({
                    content: card.content,
                    is_success: card.is_success,
                    is_alert: card.is_alert,
                })),
            })),
            board.metrics
        );

        // Save summary to board
        await updateRetroBoard(boardId, { ai_summary: summary });

        return NextResponse.json({
            success: true,
            summary,
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
