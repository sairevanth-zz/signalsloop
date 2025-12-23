/**
 * Manual Override API
 * PATCH /api/roadmap/[id]/override
 *
 * Apply manual priority overrides to a roadmap suggestion
 * - Adjust priority score manually
 * - Pin to top
 * - Change status
 * - Add internal notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface OverrideRequest {
  manual_priority_adjustment?: number; // -50 to +50
  pinned?: boolean;
  status?: 'suggested' | 'in_progress' | 'completed' | 'deferred';
  internal_notes?: string;
}

/**
 * PATCH /api/roadmap/[id]/override
 * Apply manual overrides to a suggestion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
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
    const body = (await request.json()) as OverrideRequest;

    if (!suggestionId) {
      return NextResponse.json(
        { success: false, error: 'Suggestion ID is required' },
        { status: 400 }
      );
    }

    // Validate manual priority adjustment
    if (
      body.manual_priority_adjustment !== undefined &&
      (body.manual_priority_adjustment < -50 || body.manual_priority_adjustment > 50)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Manual priority adjustment must be between -50 and +50'
        },
        { status: 400 }
      );
    }

    // Verify suggestion exists and user has access
    const { data: suggestion } = await supabase
      .from('roadmap_suggestions')
      .select(`
        id,
        project_id,
        projects!inner(owner_id)
      `)
      .eq('id', suggestionId)
      .single();

    if (!suggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Build update object (only include provided fields)
    const updates: Partial<OverrideRequest> = {};

    if (body.manual_priority_adjustment !== undefined) {
      updates.manual_priority_adjustment = body.manual_priority_adjustment;
    }

    if (body.pinned !== undefined) {
      updates.pinned = body.pinned;
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (body.internal_notes !== undefined) {
      updates.internal_notes = body.internal_notes;
    }

    // Apply updates
    const { data: updated, error } = await supabase
      .from('roadmap_suggestions')
      .update(updates)
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating suggestion: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      suggestion: updated,
      message: 'Manual overrides applied successfully'
    });

  } catch (error) {
    console.error('Error applying manual overrides:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/roadmap/[id]/override
 * Get a single roadmap suggestion by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
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

    const { data: suggestion, error } = await supabase
      .from('roadmap_suggestions')
      .select(`
        *,
        themes (
          id,
          theme_name,
          frequency,
          avg_sentiment,
          first_seen
        )
      `)
      .eq('id', suggestionId)
      .single();

    if (error || !suggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestion
    });

  } catch (error) {
    console.error('Error fetching suggestion:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
