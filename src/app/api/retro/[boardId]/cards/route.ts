/**
 * Cards API Route
 * POST /api/retro/[boardId]/cards - Add a card
 * PATCH /api/retro/[boardId]/cards - Update a card
 * DELETE /api/retro/[boardId]/cards - Delete a card
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { addCard, updateCard, deleteCard } from '@/lib/retro';
import { CreateRetroCardSchema } from '@/types/retro';

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

        const body = await request.json();
        const validation = CreateRetroCardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const card = await addCard(validation.data, user.id);

        if (!card) {
            return NextResponse.json({ error: 'Failed to add card' }, { status: 500 });
        }

        return NextResponse.json({ card }, { status: 201 });
    } catch (error) {
        console.error('Error adding card:', error);
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
        const { cardId, ...updates } = body;

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
        }

        const card = await updateCard(cardId, updates);

        if (!card) {
            return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
        }

        return NextResponse.json({ card });
    } catch (error) {
        console.error('Error updating card:', error);
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
        const cardId = searchParams.get('cardId');

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
        }

        const success = await deleteCard(cardId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting card:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
