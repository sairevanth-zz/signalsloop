/**
 * Regenerate AI Reasoning API
 * POST /api/roadmap/[id]/reasoning
 *
 * Regenerate AI reasoning for a specific roadmap suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { regenerateReasoningForSuggestion } from '@/lib/roadmap';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for GPT-4 call

/**
 * POST /api/roadmap/[id]/reasoning
 * Regenerate AI reasoning for a suggestion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const suggestionId = params.id;

    if (!suggestionId) {
      return NextResponse.json(
        { success: false, error: 'Suggestion ID is required' },
        { status: 400 }
      );
    }

    // Verify suggestion exists and user has access
    const { data: suggestion } = await supabase
      .from('roadmap_suggestions')
      .select(`
        id,
        project_id,
        projects!inner(user_id)
      `)
      .eq('id', suggestionId)
      .single();

    if (!suggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Regenerate reasoning
    console.log(`Regenerating AI reasoning for suggestion ${suggestionId}...`);
    await regenerateReasoningForSuggestion(suggestionId);

    // Fetch updated suggestion
    const { data: updated } = await supabase
      .from('roadmap_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    return NextResponse.json({
      success: true,
      suggestion: updated,
      message: 'AI reasoning regenerated successfully'
    });

  } catch (error) {
    console.error('Error regenerating AI reasoning:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
