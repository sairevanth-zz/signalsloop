/**
 * Checklist API Route
 * POST /api/launch/[boardId]/checklist - Add a checklist item
 * PATCH /api/launch/[boardId]/checklist - Toggle a checklist item
 * DELETE /api/launch/[boardId]/checklist - Delete a checklist item
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from '@/lib/launch';

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
        const body = await request.json();

        if (!body.title) {
            return NextResponse.json({ error: 'Title required' }, { status: 400 });
        }

        const item = await addChecklistItem(boardId, body);

        if (!item) {
            return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
        }

        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        console.error('Error adding checklist item:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
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
        const { itemId, completed } = body;

        if (!itemId || typeof completed !== 'boolean') {
            return NextResponse.json({ error: 'Item ID and completed status required' }, { status: 400 });
        }

        const item = await toggleChecklistItem(itemId, completed);

        if (!item) {
            return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
        }

        return NextResponse.json({ item });
    } catch (error) {
        console.error('Error updating checklist item:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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
        const itemId = searchParams.get('itemId');

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
        }

        const success = await deleteChecklistItem(itemId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting checklist item:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
