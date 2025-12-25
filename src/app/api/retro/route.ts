/**
 * Retro Boards API Route
 * GET /api/retro - List boards for a project
 * POST /api/retro - Create a new retro board
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { createRetroBoard, getRetroBoardsForProject } from '@/lib/retro';
import { CreateRetroBoardSchema } from '@/types/retro';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        const boards = await getRetroBoardsForProject(projectId);
        return NextResponse.json({ boards });
    } catch (error) {
        console.error('Error fetching retro boards:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

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
        const validation = CreateRetroBoardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const board = await createRetroBoard(validation.data, user.id);

        if (!board) {
            return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
        }

        return NextResponse.json({ board }, { status: 201 });
    } catch (error) {
        console.error('Error creating retro board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
