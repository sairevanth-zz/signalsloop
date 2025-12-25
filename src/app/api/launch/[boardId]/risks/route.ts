/**
 * Risks API Route
 * POST /api/launch/[boardId]/risks - Add a risk
 * PATCH /api/launch/[boardId]/risks - Update a risk
 * DELETE /api/launch/[boardId]/risks - Delete a risk
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import { addRisk, updateRisk, deleteRisk } from '@/lib/launch';
import { CreateRiskSchema } from '@/types/launch';

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
        const validation = CreateRiskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors }, { status: 400 });
        }

        const risk = await addRisk(boardId, validation.data);

        if (!risk) {
            return NextResponse.json({ error: 'Failed to add risk' }, { status: 500 });
        }

        return NextResponse.json({ risk }, { status: 201 });
    } catch (error) {
        console.error('Error adding risk:', error);
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
        const { riskId, ...updates } = body;

        if (!riskId) {
            return NextResponse.json({ error: 'Risk ID required' }, { status: 400 });
        }

        const risk = await updateRisk(riskId, updates);

        if (!risk) {
            return NextResponse.json({ error: 'Failed to update risk' }, { status: 500 });
        }

        return NextResponse.json({ risk });
    } catch (error) {
        console.error('Error updating risk:', error);
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
        const riskId = searchParams.get('riskId');

        if (!riskId) {
            return NextResponse.json({ error: 'Risk ID required' }, { status: 400 });
        }

        const success = await deleteRisk(riskId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete risk' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting risk:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
