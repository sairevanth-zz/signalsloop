/**
 * API Routes for Specs CRUD Operations
 * GET /api/specs - List all specs for a project
 * POST /api/specs - Create a new spec
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import type { Spec, SpecSortOption } from '@/types/specs';
import { triggerDiscordNotification } from '@/lib/discord';
import { triggerSlackNotification } from '@/lib/slack';

// ============================================================================
// GET /api/specs - List specs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');
    const status = searchParams.get('status')?.split(',');
    const template = searchParams.get('template')?.split(',');
    const sort = (searchParams.get('sort') as SpecSortOption) || 'created_desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('specs')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (search) {
      query = query.textSearch('search_vector', search);
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (template && template.length > 0) {
      query = query.in('template', template);
    }

    // Apply sorting
    switch (sort) {
      case 'created_desc':
        query = query.order('created_at', { ascending: false });
        break;
      case 'created_asc':
        query = query.order('created_at', { ascending: true });
        break;
      case 'updated_desc':
        query = query.order('updated_at', { ascending: false });
        break;
      case 'updated_asc':
        query = query.order('updated_at', { ascending: true });
        break;
      case 'title_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'title_desc':
        query = query.order('title', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching specs:', error);
      return NextResponse.json({ error: 'Failed to fetch specs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      specs: data as Spec[],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/specs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/specs - Create a new spec
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      projectId,
      title,
      inputIdea,
      content,
      status = 'draft',
      template = 'standard',
      generationModel,
      generationTokens,
      generationTimeMs,
      contextSources = [],
      linkedFeedbackIds = [],
    } = body;

    // Validate required fields
    if (!projectId || !title || !content) {
      return NextResponse.json(
        { error: 'Project ID, title, and content are required' },
        { status: 400 }
      );
    }

    // Create spec
    const { data: spec, error: insertError } = await supabase
      .from('specs')
      .insert({
        project_id: projectId,
        created_by: user.id,
        title,
        input_idea: inputIdea,
        content,
        status,
        template,
        generation_model: generationModel || 'gpt-4o',
        generation_tokens: generationTokens,
        generation_time_ms: generationTimeMs,
        context_sources: contextSources,
        linked_feedback_ids: linkedFeedbackIds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating spec:', insertError);
      return NextResponse.json({ error: 'Failed to create spec' }, { status: 500 });
    }

    // Create initial version
    const { error: versionError } = await supabase.from('spec_versions').insert({
      spec_id: spec.id,
      version_number: 1,
      content,
      changed_by: user.id,
      change_summary: 'Initial version',
    });

    if (versionError) {
      console.error('Error creating spec version:', versionError);
      // Don't fail the request if version creation fails
    }

    // Trigger notifications for new spec
    const notificationPayload = {
      spec: {
        id: spec.id,
        title: spec.title,
        feedback_count: linkedFeedbackIds?.length ?? 0,
      },
    };
    triggerDiscordNotification(projectId, 'spec.generated', notificationPayload);
    triggerSlackNotification(projectId, 'spec.generated', notificationPayload);

    return NextResponse.json({
      success: true,
      spec: spec as Spec,
    });
  } catch (error) {
    console.error('Error in POST /api/specs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
