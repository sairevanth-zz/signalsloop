import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/user-stories/[projectId]
 * Get all user stories for a project
 *
 * Query params:
 * - sprint_id?: string
 * - sprint_status?: string
 * - theme_id?: string
 * - limit?: number
 * - offset?: number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const sprintId = searchParams.get('sprint_id');
    const sprintStatus = searchParams.get('sprint_status');
    const themeId = searchParams.get('theme_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseServiceRoleClient();

    let query = supabase
      .from('user_stories_with_details')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sprintId) {
      query = query.eq('sprint_id', sprintId);
    }

    if (sprintStatus) {
      query = query.eq('sprint_status', sprintStatus);
    }

    if (themeId) {
      query = query.eq('theme_id', themeId);
    }

    const { data: stories, error } = await query;

    if (error) {
      console.error('[USER-STORIES-API] Error fetching stories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stories: stories || [],
      count: stories?.length || 0,
    });
  } catch (error) {
    console.error('[USER-STORIES-API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-stories/[projectId]
 * Create a new user story manually
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const supabase = getSupabaseServiceRoleClient();

    const { data: story, error } = await supabase
      .from('user_stories')
      .insert({
        ...body,
        project_id: projectId,
        generated_by_ai: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[USER-STORIES-API] Error creating story:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, story });
  } catch (error) {
    console.error('[USER-STORIES-API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user-stories/[projectId]?story_id=xxx
 * Update a user story
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');

    if (!storyId) {
      return NextResponse.json(
        { error: 'story_id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const supabase = getSupabaseServiceRoleClient();

    const { data: story, error } = await supabase
      .from('user_stories')
      .update(body)
      .eq('id', storyId)
      .select()
      .single();

    if (error) {
      console.error('[USER-STORIES-API] Error updating story:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, story });
  } catch (error) {
    console.error('[USER-STORIES-API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-stories/[projectId]?story_id=xxx
 * Delete a user story
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');

    if (!storyId) {
      return NextResponse.json(
        { error: 'story_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();

    const { error } = await supabase
      .from('user_stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      console.error('[USER-STORIES-API] Error deleting story:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USER-STORIES-API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
