/**
 * API: Churn Alerts
 * List and manage churn alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { churnRadarService } from '@/lib/churn-radar';

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
    
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const result = await churnRadarService.listAlerts(projectId, {
      status,
      severity,
      page,
      limit: Math.min(limit, 100),
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] List alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to list alerts' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { alertId, status, notes } = body;
    
    if (!alertId || !status) {
      return NextResponse.json({ error: 'Alert ID and status required' }, { status: 400 });
    }
    
    const success = await churnRadarService.updateAlertStatus(alertId, status, user.id, notes);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Update alert error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
