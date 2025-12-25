/**
 * Dimensions API Route
 * PATCH /api/launch/[boardId]/dimensions - Update a dimension
 * POST /api/launch/[boardId]/dimensions - Add a customer quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { updateDimension } from '@/lib/launch';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

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

        const body = await request.json();
        const { dimensionId, quote } = body;

        if (!dimensionId || !quote) {
            return NextResponse.json({ error: 'Dimension ID and quote required' }, { status: 400 });
        }

        // Fetch current dimension to get existing quotes
        const serviceClient = getSupabaseServiceRoleClient();
        if (!serviceClient) {
            return NextResponse.json({ error: 'Server error' }, { status: 500 });
        }

        const { data: dimension, error: fetchError } = await serviceClient
            .from('launch_dimensions')
            .select('customer_quotes')
            .eq('id', dimensionId)
            .single();

        if (fetchError) {
            return NextResponse.json({ error: 'Dimension not found' }, { status: 404 });
        }

        const existingQuotes = dimension.customer_quotes || [];
        const updatedQuotes = [...existingQuotes, quote];

        // Update dimension with new quote
        const { data: updatedDimension, error: updateError } = await serviceClient
            .from('launch_dimensions')
            .update({ customer_quotes: updatedQuotes })
            .eq('id', dimensionId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: 'Failed to add quote' }, { status: 500 });
        }

        return NextResponse.json({ dimension: updatedDimension, quote });
    } catch (error) {
        console.error('Error adding quote:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
