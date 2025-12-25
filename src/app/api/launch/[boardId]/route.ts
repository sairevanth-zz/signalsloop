/**
 * Launch Board Detail API Route
 * GET /api/launch/[boardId] - Get board with details
 * PATCH /api/launch/[boardId] - Update board
 * DELETE /api/launch/[boardId] - Delete board
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getLaunchBoard, updateLaunchBoard, deleteLaunchBoard } from '@/lib/launch';
import { UpdateLaunchBoardSchema } from '@/types/launch';

interface RouteParams {
    params: Promise<{ boardId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
        const board = await getLaunchBoard(boardId);

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        return NextResponse.json({ board });
    } catch (error) {
        console.error('Error fetching launch board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        const body = await request.json();
        const validation = UpdateLaunchBoardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const board = await updateLaunchBoard(boardId, validation.data);

        if (!board) {
            return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
        }

        return NextResponse.json({ board });
    } catch (error) {
        console.error('Error updating launch board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        const success = await deleteLaunchBoard(boardId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting launch board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
