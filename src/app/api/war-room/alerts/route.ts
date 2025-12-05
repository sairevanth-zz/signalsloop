/**
 * War Room Alerts API
 * GET - List alerts
 * POST - Create alert
 * PATCH - Update alert status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { warRoomService, AlertStatus, AlertFilters } from '@/lib/war-room';

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

    const filters: AlertFilters = {};
    const statusParam = request.nextUrl.searchParams.get('status');
    if (statusParam) {
      filters.status = statusParam.split(',') as AlertStatus[];
    }
    const severityParam = request.nextUrl.searchParams.get('severity');
    if (severityParam) {
      filters.severity = severityParam.split(',') as any[];
    }
    const typeParam = request.nextUrl.searchParams.get('type');
    if (typeParam) {
      filters.alert_type = typeParam.split(',') as any[];
    }
    const competitor = request.nextUrl.searchParams.get('competitor');
    if (competitor) {
      filters.competitor_name = competitor;
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const { alerts, total } = await warRoomService.listAlerts(projectId, filters, limit, offset);

    return NextResponse.json({
      success: true,
      alerts,
      total,
      pagination: { limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('[API] List alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const alert = await warRoomService.createAlert(body);

    if (!alert) {
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('[API] Create alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'alertId and status required' }, { status: 400 });
    }

    const success = await warRoomService.updateAlertStatus(alertId, status, user.id, notes);

    if (!success) {
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Update alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
