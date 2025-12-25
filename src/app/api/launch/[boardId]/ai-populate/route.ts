/**
 * AI Populate API Route
 * POST /api/launch/[boardId]/ai-populate - Trigger AI population for all dimensions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getLaunchBoard } from '@/lib/launch/launch-board-service';
import { populateAllDimensions } from '@/lib/launch/dimension-scoring';
import { detectRisks, generateDefaultChecklist } from '@/lib/launch/risk-detection';

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

        // Get the board to get project ID and title
        const board = await getLaunchBoard(boardId);
        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        // Populate dimensions with AI
        const dimensions = await populateAllDimensions(
            boardId,
            board.project_id,
            board.title
        );

        // Detect risks
        const risks = await detectRisks(
            boardId,
            board.project_id,
            board.title
        );

        // Generate default checklist if empty
        let checklistItems = board.checklist_items;
        if (checklistItems.length === 0) {
            checklistItems = await generateDefaultChecklist(boardId, board.title);
        }

        return NextResponse.json({
            success: true,
            dimensions,
            risks,
            checklist_items: checklistItems,
        });
    } catch (error) {
        console.error('Error populating launch board with AI:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
