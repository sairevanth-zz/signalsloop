import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ingestAnalyticsEvents, AnalyticsSource } from '@/lib/integrations/analytics/ingest';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, source, events } = body || {};

    if (!projectId || !source || !events) {
      return NextResponse.json(
        { success: false, error: 'projectId, source, and events are required' },
        { status: 400 }
      );
    }

    const allowedSources: AnalyticsSource[] = ['mixpanel', 'amplitude', 'segment', 'custom'];
    if (!allowedSources.includes(source)) {
      return NextResponse.json({ success: false, error: 'Invalid source' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns the project
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await ingestAnalyticsEvents({
      projectId,
      source,
      events,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Analytics Ingest] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest analytics events' },
      { status: 500 }
    );
  }
}
