/**
 * API Route: Scheduled Queries
 * GET /api/ask/scheduled-queries - List scheduled queries
 * POST /api/ask/scheduled-queries - Create a scheduled query
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import type {
  CreateScheduledQueryRequest,
  CreateScheduledQueryResponse,
  ListScheduledQueriesResponse,
} from '@/types/ask';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// GET Handler - List scheduled queries
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ListScheduledQueriesResponse,
        { status: 401 }
      );
    }

    // Get project ID from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' } as ListScheduledQueriesResponse,
        { status: 400 }
      );
    }

    // Verify project access
    const { data: projectAccess } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!projectAccess) {
      const { data: memberAccess } = await supabase
        .from('members')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!memberAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied' } as ListScheduledQueriesResponse,
          { status: 403 }
        );
      }
    }

    // Get scheduled queries
    const { data: queries, error } = await supabase
      .from('ask_scheduled_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled queries:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch scheduled queries' } as ListScheduledQueriesResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      queries,
    } as ListScheduledQueriesResponse);
  } catch (error) {
    console.error('Error in GET /api/ask/scheduled-queries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as ListScheduledQueriesResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Create scheduled query
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as CreateScheduledQueryResponse,
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as CreateScheduledQueryRequest;
    const {
      projectId,
      query_text,
      frequency,
      day_of_week,
      day_of_month,
      time_utc,
      delivery_method,
      slack_channel_id,
    } = body;

    // Validate required fields
    if (!projectId || !query_text || !frequency || !delivery_method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: projectId, query_text, frequency, delivery_method',
        } as CreateScheduledQueryResponse,
        { status: 400 }
      );
    }

    // Validate frequency-specific fields
    if (frequency === 'weekly' && day_of_week === undefined) {
      return NextResponse.json(
        { success: false, error: 'day_of_week is required for weekly frequency' } as CreateScheduledQueryResponse,
        { status: 400 }
      );
    }

    if (frequency === 'monthly' && day_of_month === undefined) {
      return NextResponse.json(
        { success: false, error: 'day_of_month is required for monthly frequency' } as CreateScheduledQueryResponse,
        { status: 400 }
      );
    }

    // Verify project access
    const { data: projectAccess } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!projectAccess) {
      const { data: memberAccess } = await supabase
        .from('members')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!memberAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied' } as CreateScheduledQueryResponse,
          { status: 403 }
        );
      }
    }

    // Create scheduled query
    const { data: scheduledQuery, error } = await supabase
      .from('ask_scheduled_queries')
      .insert({
        project_id: projectId,
        user_id: user.id,
        query_text,
        frequency,
        day_of_week,
        day_of_month,
        time_utc: time_utc || '09:00:00',
        delivery_method,
        slack_channel_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scheduled query:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create scheduled query' } as CreateScheduledQueryResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scheduled_query: scheduledQuery,
    } as CreateScheduledQueryResponse);
  } catch (error) {
    console.error('Error in POST /api/ask/scheduled-queries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as CreateScheduledQueryResponse,
      { status: 500 }
    );
  }
}
