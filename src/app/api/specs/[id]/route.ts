/**
 * API Routes for Individual Spec Operations
 * GET /api/specs/[id] - Get a specific spec
 * PUT /api/specs/[id] - Update a spec
 * DELETE /api/specs/[id] - Delete a spec
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import type { Spec } from '@/types/specs';

// ============================================================================
// GET /api/specs/[id] - Get specific spec
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { id } = params;

    // Fetch spec
    const { data: spec, error } = await supabase
      .from('specs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching spec:', error);
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      spec: spec as Spec,
    });
  } catch (error) {
    console.error('Error in GET /api/specs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/specs/[id] - Update spec
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await request.json();
    const {
      title,
      content,
      status,
      publishedAt,
      createVersion = false,
      versionSummary,
    } = body;

    // Fetch current spec to get version info
    const { data: currentSpec, error: fetchError } = await supabase
      .from('specs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentSpec) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    if (publishedAt !== undefined) updates.published_at = publishedAt;

    // Update spec
    const { data: updatedSpec, error: updateError } = await supabase
      .from('specs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating spec:', updateError);
      return NextResponse.json({ error: 'Failed to update spec' }, { status: 500 });
    }

    // Create version if requested
    let version = null;
    if (createVersion && content !== undefined) {
      // Get latest version number
      const { data: versions, error: versionQueryError } = await supabase
        .from('spec_versions')
        .select('version_number')
        .eq('spec_id', id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersionNumber = versions && versions.length > 0
        ? versions[0].version_number + 1
        : 1;

      const { data: newVersion, error: versionError } = await supabase
        .from('spec_versions')
        .insert({
          spec_id: id,
          version_number: nextVersionNumber,
          content,
          changed_by: user.id,
          change_summary: versionSummary || `Version ${nextVersionNumber}`,
        })
        .select()
        .single();

      if (!versionError && newVersion) {
        version = newVersion;
      }
    }

    return NextResponse.json({
      success: true,
      spec: updatedSpec as Spec,
      version,
    });
  } catch (error) {
    console.error('Error in PUT /api/specs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/specs/[id] - Delete spec
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Delete spec (cascade will delete versions, embeddings, and context sources)
    const { error: deleteError } = await supabase
      .from('specs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting spec:', deleteError);
      return NextResponse.json({ error: 'Failed to delete spec' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Spec deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/specs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
