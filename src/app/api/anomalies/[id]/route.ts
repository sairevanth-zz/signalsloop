/**
 * Anomaly Management API
 *
 * PATCH /api/anomalies/[id]
 * - Update anomaly status (acknowledge, resolve, mark as false positive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH - Update anomaly status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, userNotes } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['active', 'investigating', 'resolved', 'false_positive'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();

    const updateData: any = {
      status,
      is_acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    };

    if (userNotes) {
      updateData.user_notes = userNotes;
    }

    const { data, error } = await supabase
      .from('anomaly_detections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ANOMALY API] Error updating anomaly:', error);
      return NextResponse.json(
        { error: 'Failed to update anomaly' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      anomaly: {
        id: data.id,
        status: data.status,
        isAcknowledged: data.is_acknowledged,
        acknowledgedAt: data.acknowledged_at,
        userNotes: data.user_notes,
      },
    });
  } catch (error) {
    console.error('[ANOMALY API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
