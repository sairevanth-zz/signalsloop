/**
 * War Room Summary API
 * GET - Get war room summary for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { warRoomService } from '@/lib/war-room';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const summary = await warRoomService.getSummary(projectId);
    const hiringTrends = await warRoomService.getHiringTrends(projectId);

    return NextResponse.json({
      success: true,
      summary,
      hiringTrends,
    });
  } catch (error) {
    console.error('[API] War room summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
