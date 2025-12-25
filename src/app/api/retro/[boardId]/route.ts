/**
 * Retro Board Detail API Route
 * GET /api/retro/[boardId] - Get board with details
 * PATCH /api/retro/[boardId] - Update board
 * DELETE /api/retro/[boardId] - Delete board
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { getRetroBoard, updateRetroBoard, deleteRetroBoard } from '@/lib/retro';
import { UpdateRetroBoardSchema } from '@/types/retro';

interface RouteParams {
    params: Promise<{ boardId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
        const board = await getRetroBoard(boardId);

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        return NextResponse.json({ board });
    } catch (error) {
        console.error('Error fetching retro board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        const body = await request.json();
        const validation = UpdateRetroBoardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const board = await updateRetroBoard(boardId, validation.data);

        if (!board) {
            return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
        }

        return NextResponse.json({ board });
    } catch (error) {
        console.error('Error updating retro board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        const success = await deleteRetroBoard(boardId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting retro board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
