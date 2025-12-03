/**
 * API Route: Single Scheduled Query
 * PATCH /api/ask/scheduled-queries/[id] - Update a scheduled query
 * DELETE /api/ask/scheduled-queries/[id] - Delete a scheduled query
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import type {
  UpdateScheduledQueryRequest,
  UpdateScheduledQueryResponse,
} from '@/types/ask';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// PATCH Handler - Update scheduled query
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as UpdateScheduledQueryResponse,
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as UpdateScheduledQueryRequest;

    // Get existing scheduled query
    const { data: existingQuery, error: fetchError } = await supabase
      .from('ask_scheduled_queries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingQuery) {
      return NextResponse.json(
        { success: false, error: 'Scheduled query not found' } as UpdateScheduledQueryResponse,
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingQuery.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' } as UpdateScheduledQueryResponse,
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.query_text) updates.query_text = body.query_text;
    if (body.frequency) updates.frequency = body.frequency;
    if (body.day_of_week !== undefined) updates.day_of_week = body.day_of_week;
    if (body.day_of_month !== undefined) updates.day_of_month = body.day_of_month;
    if (body.time_utc) updates.time_utc = body.time_utc;
    if (body.delivery_method) updates.delivery_method = body.delivery_method;
    if (body.slack_channel_id !== undefined) updates.slack_channel_id = body.slack_channel_id;

    // Update scheduled query
    const { data: updatedQuery, error: updateError } = await supabase
      .from('ask_scheduled_queries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scheduled query:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update scheduled query' } as UpdateScheduledQueryResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scheduled_query: updatedQuery,
    } as UpdateScheduledQueryResponse);
  } catch (error) {
    console.error('Error in PATCH /api/ask/scheduled-queries/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as UpdateScheduledQueryResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE Handler - Delete scheduled query
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get existing scheduled query
    const { data: existingQuery, error: fetchError } = await supabase
      .from('ask_scheduled_queries')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingQuery) {
      return NextResponse.json(
        { success: false, error: 'Scheduled query not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingQuery.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete scheduled query
    const { error: deleteError } = await supabase
      .from('ask_scheduled_queries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting scheduled query:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete scheduled query' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/ask/scheduled-queries/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
