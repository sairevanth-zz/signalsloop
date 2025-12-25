/**
 * Votes API Route
 * POST /api/launch/[boardId]/votes - Add a stakeholder
 * PATCH /api/launch/[boardId]/votes - Cast a vote
 * DELETE /api/launch/[boardId]/votes - Remove a stakeholder
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { addStakeholder, castVote, removeStakeholder } from '@/lib/launch';
import { AddStakeholderSchema, CastVoteSchema } from '@/types/launch';

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
        const validation = AddStakeholderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const vote = await addStakeholder(boardId, validation.data);

        if (!vote) {
            return NextResponse.json({ error: 'Failed to add stakeholder' }, { status: 500 });
        }

        return NextResponse.json({ vote }, { status: 201 });
    } catch (error) {
        console.error('Error adding stakeholder:', error);
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
        const { voteId, ...voteData } = body;

        if (!voteId) {
            return NextResponse.json({ error: 'Vote ID required' }, { status: 400 });
        }

        const validation = CastVoteSchema.safeParse(voteData);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const vote = await castVote(voteId, validation.data, user.id);

        if (!vote) {
            return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
        }

        return NextResponse.json({ vote });
    } catch (error) {
        console.error('Error casting vote:', error);
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
        const voteId = searchParams.get('voteId');

        if (!voteId) {
            return NextResponse.json({ error: 'Vote ID required' }, { status: 400 });
        }

        const success = await removeStakeholder(voteId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to remove stakeholder' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing stakeholder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
