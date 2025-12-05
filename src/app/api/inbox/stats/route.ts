/**
 * API: Inbox Statistics
 * Get aggregated stats for the unified inbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { InboxService } from '@/lib/inbox/inbox-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    const inboxService = new InboxService(supabase);
    const stats = await inboxService.getStats(projectId);
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('[API] Inbox stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox stats' },
      { status: 500 }
    );
  }
}
