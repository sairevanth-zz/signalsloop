/**
 * Actions API Route
 * POST /api/retro/[boardId]/actions - Add an action
 * PATCH /api/retro/[boardId]/actions - Update an action
 * DELETE /api/retro/[boardId]/actions - Delete an action
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { addAction, updateAction, deleteAction } from '@/lib/retro';
import { CreateRetroActionSchema, UpdateRetroActionSchema } from '@/types/retro';

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
        const body = await request.json();
        const validation = CreateRetroActionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const action = await addAction(boardId, validation.data);

        if (!action) {
            return NextResponse.json({ error: 'Failed to add action' }, { status: 500 });
        }

        return NextResponse.json({ action }, { status: 201 });
    } catch (error) {
        console.error('Error adding action:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
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
        const { actionId, ...updates } = body;

        if (!actionId) {
            return NextResponse.json({ error: 'Action ID required' }, { status: 400 });
        }

        const validation = UpdateRetroActionSchema.safeParse(updates);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const action = await updateAction(actionId, validation.data);

        if (!action) {
            return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
        }

        return NextResponse.json({ action });
    } catch (error) {
        console.error('Error updating action:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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
        const actionId = searchParams.get('actionId');

        if (!actionId) {
            return NextResponse.json({ error: 'Action ID required' }, { status: 400 });
        }

        const success = await deleteAction(actionId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete action' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting action:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
