/**
 * API Route: Dismiss Suggestion
 * POST /api/ask/suggestions/[id]/dismiss
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import type { DismissSuggestionResponse } from '@/types/ask';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// POST Handler - Dismiss suggestion
// ============================================================================

export async function POST(
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
        { success: false, error: 'Unauthorized' } as DismissSuggestionResponse,
        { status: 401 }
      );
    }

    // Get existing suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('ask_proactive_suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggestion not found' } as DismissSuggestionResponse,
        { status: 404 }
      );
    }

    // Verify project access
    const { data: projectAccess } = await supabase
      .from('projects')
      .select('id')
      .eq('id', suggestion.project_id)
      .single();

    if (!projectAccess) {
      const { data: memberAccess } = await supabase
        .from('members')
        .select('project_id')
        .eq('project_id', suggestion.project_id)
        .eq('user_id', user.id)
        .single();

      if (!memberAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied' } as DismissSuggestionResponse,
          { status: 403 }
        );
      }
    }

    // Dismiss the suggestion
    const { error: updateError } = await supabase
      .from('ask_proactive_suggestions')
      .update({
        status: 'dismissed',
        dismissed_by: user.id,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error dismissing suggestion:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to dismiss suggestion' } as DismissSuggestionResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    } as DismissSuggestionResponse);
  } catch (error) {
    console.error('Error in POST /api/ask/suggestions/[id]/dismiss:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as DismissSuggestionResponse,
      { status: 500 }
    );
  }
}
