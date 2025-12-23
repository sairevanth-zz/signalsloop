/**
 * Competitors API
 * GET: List all competitors
 * POST: Add competitor manually
 * PUT: Update competitor
 * DELETE: Remove competitor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/competitive/competitors?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // Filter by status

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
    );

    let query = supabase
      .from('competitive_dashboard_overview')
      .select('*')
      .eq('project_id', projectId)
      .order('total_mentions', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: competitors, error } = await query;

    if (error) {
      console.error('[Competitors API] Error fetching competitors:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      competitors: competitors || [],
      total: competitors?.length || 0,
    });
  } catch (error) {
    console.error('[Competitors API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch competitors',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/competitive/competitors
 * Add a competitor manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, category, website, description } = body;

    if (!projectId || !name) {
      return NextResponse.json({ success: false, error: 'projectId and name are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
    );

    // Check if competitor already exists
    const { data: existing } = await supabase
      .from('competitors')
      .select('id')
      .eq('project_id', projectId)
      .ilike('name', name)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: 'Competitor already exists' }, { status: 409 });
    }

    // Insert new competitor
    const { data: newCompetitor, error: insertError } = await supabase
      .from('competitors')
      .insert({
        project_id: projectId,
        name,
        category: category || null,
        website: website || null,
        description: description || null,
        auto_detected: false, // Manually added
        status: 'active',
        total_mentions: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Competitors API] Error creating competitor:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      competitor: newCompetitor,
    });
  } catch (error) {
    console.error('[Competitors API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create competitor',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/competitive/competitors
 * Update a competitor
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitorId, name, category, website, description, status } = body;

    if (!competitorId) {
      return NextResponse.json({ success: false, error: 'competitorId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
    );

    const updateData: {
      name?: string;
      category?: string | null;
      website?: string | null;
      description?: string | null;
      status?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (category !== undefined) updateData.category = category || null;
    if (website !== undefined) updateData.website = website || null;
    if (description !== undefined) updateData.description = description || null;
    if (status) updateData.status = status;

    const { data: updatedCompetitor, error: updateError } = await supabase
      .from('competitors')
      .update(updateData)
      .eq('id', competitorId)
      .select()
      .single();

    if (updateError) {
      console.error('[Competitors API] Error updating competitor:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      competitor: updatedCompetitor,
    });
  } catch (error) {
    console.error('[Competitors API] PUT Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update competitor',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/competitive/competitors?competitorId=xxx
 * Delete a competitor
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');

    if (!competitorId) {
      return NextResponse.json({ success: false, error: 'competitorId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
    );

    const { error: deleteError } = await supabase.from('competitors').delete().eq('id', competitorId);

    if (deleteError) {
      console.error('[Competitors API] Error deleting competitor:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Competitor deleted successfully',
    });
  } catch (error) {
    console.error('[Competitors API] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete competitor',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
