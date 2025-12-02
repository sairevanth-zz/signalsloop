/**
 * API Route: Create Competitor Event Manually
 *
 * Allows manual creation of competitor events without Firecrawl.
 * This is the "manual mode" for Devil's Advocate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCompetitorEvent } from '@/lib/devils-advocate';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for GPT-4o analysis

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { competitor_id, project_id, raw_content } = body;

    if (!competitor_id || !project_id || !raw_content) {
      return NextResponse.json(
        { error: 'competitor_id, project_id, and raw_content are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('owner_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }

    // Verify competitor exists and belongs to project
    const { data: competitor } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('id', competitor_id)
      .eq('project_id', project_id)
      .single();

    if (!competitor) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 }
      );
    }

    // Create the event
    const event = await createCompetitorEvent(competitor_id, project_id, raw_content);

    return NextResponse.json({
      success: true,
      event,
      message: `Competitor event created and analyzed with GPT-4o`,
    });
  } catch (error) {
    console.error('[CompetitorEvents] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create competitor event' },
      { status: 500 }
    );
  }
}

/**
 * Get competitor events for a project
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const competitorId = searchParams.get('competitorId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('competitor_events')
      .select(`
        *,
        competitors:competitor_id (
          id,
          name
        )
      `)
      .eq('project_id', projectId)
      .order('event_date', { ascending: false })
      .limit(limit);

    if (competitorId) {
      query = query.eq('competitor_id', competitorId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      events: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('[CompetitorEvents] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor events' },
      { status: 500 }
    );
  }
}
