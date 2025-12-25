/**
 * Dimensions API Route
 * PATCH /api/launch/[boardId]/dimensions - Update a dimension
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { updateDimension } from '@/lib/launch';

interface RouteParams {
    params: Promise<{ boardId: string }>;
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

        const body = await request.json();
        const { dimensionId, ...updates } = body;

        if (!dimensionId) {
            return NextResponse.json({ error: 'Dimension ID required' }, { status: 400 });
        }

        const dimension = await updateDimension(dimensionId, updates);

        if (!dimension) {
            return NextResponse.json({ error: 'Failed to update dimension' }, { status: 500 });
        }

        return NextResponse.json({ dimension });
    } catch (error) {
        console.error('Error updating dimension:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
