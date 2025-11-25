import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
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

    // Verify ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Velocity: last 4 sprints
    const { data: velocityRows } = await supabase
      .from('team_velocity')
      .select('sprint_name, sprint_end_date, completed_points')
      .eq('project_id', projectId)
      .order('sprint_end_date', { ascending: false })
      .limit(4);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: usageRows } = await supabase
      .from('usage_analytics_events')
      .select('event_name, distinct_id, occurred_at')
      .eq('project_id', projectId)
      .gte('occurred_at', sevenDaysAgo)
      .limit(500);

    const wau = new Set((usageRows || []).map(row => row.distinct_id).filter(Boolean)).size;
    const events7d = usageRows?.length || 0;
    const topEvents = aggregateTopEvents(usageRows || [], 5);

    return NextResponse.json({
      success: true,
      velocity: velocityRows || [],
      usage: {
        wau,
        events_7d: events7d,
        top_events: topEvents,
      },
    });
  } catch (error) {
    console.error('[Dashboard Cross-Tool] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load cross-tool intelligence' },
      { status: 500 }
    );
  }
}

function aggregateTopEvents(
  rows: Array<{ event_name?: string | null }>,
  limit: number
): Array<{ event: string; count: number }> {
  const counts: Record<string, number> = {};

  rows.forEach(row => {
    const name = row.event_name || 'unknown';
    counts[name] = (counts[name] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
