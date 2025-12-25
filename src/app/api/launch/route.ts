/**
 * Launch Boards API Route
 * GET /api/launch - List boards for a project
 * POST /api/launch - Create a new launch board
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { createLaunchBoard, getLaunchBoardsForProject } from '@/lib/launch';
import { CreateLaunchBoardSchema } from '@/types/launch';

export async function GET(request: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();
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

        const boards = await getLaunchBoardsForProject(projectId);
        return NextResponse.json({ boards });
    } catch (error) {
        console.error('Error fetching launch boards:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = CreateLaunchBoardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const board = await createLaunchBoard(validation.data, user.id);

        if (!board) {
            return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
        }

        return NextResponse.json({ board }, { status: 201 });
    } catch (error) {
        console.error('Error creating launch board:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
