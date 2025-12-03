/**
 * API Route: Proactive Suggestions
 * GET /api/ask/suggestions - List proactive suggestions
 * PATCH /api/ask/suggestions/[id] - Dismiss a suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import type { ListProactiveSuggestionsResponse } from '@/types/ask';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// GET Handler - List proactive suggestions
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
        { success: false, error: 'Unauthorized' } as ListProactiveSuggestionsResponse,
        { status: 401 }
      );
    }

    // Get project ID from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || 'active';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' } as ListProactiveSuggestionsResponse,
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
          { success: false, error: 'Access denied' } as ListProactiveSuggestionsResponse,
          { status: 403 }
        );
      }
    }

    // Build query
    let query = supabase
      .from('ask_proactive_suggestions')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', status)
      .order('priority', { ascending: false }) // critical > high > medium > low
      .order('created_at', { ascending: false });

    // Only show non-expired suggestions
    if (status === 'active') {
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
    }

    const { data: suggestions, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching proactive suggestions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch suggestions' } as ListProactiveSuggestionsResponse,
        { status: 500 }
      );
    }

    // Mark as viewed by this user
    if (suggestions && suggestions.length > 0) {
      const suggestionIds = suggestions
        .filter((s) => !s.viewed_by_users?.includes(user.id))
        .map((s) => s.id);

      if (suggestionIds.length > 0) {
        // Update viewed_by_users array
        await supabase.rpc('add_user_to_suggestion_viewers', {
          suggestion_ids: suggestionIds,
          user_id_to_add: user.id,
        }).catch(err => {
          // If RPC doesn't exist, update individually
          suggestionIds.forEach(async (id) => {
            const suggestion = suggestions.find(s => s.id === id);
            await supabase
              .from('ask_proactive_suggestions')
              .update({
                viewed_by_users: [...(suggestion?.viewed_by_users || []), user.id],
              })
              .eq('id', id);
          });
        });
      }
    }

    return NextResponse.json({
      success: true,
      suggestions,
    } as ListProactiveSuggestionsResponse);
  } catch (error) {
    console.error('Error in GET /api/ask/suggestions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as ListProactiveSuggestionsResponse,
      { status: 500 }
    );
  }
}
