/**
 * API Route: Update Risk Alert Status
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateRiskAlertStatus } from '@/lib/devils-advocate';
import { createServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolution_notes } = body;

    if (!status || !['acknowledged', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get current user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedAlert = await updateRiskAlertStatus(
      id,
      status,
      user.id,
      resolution_notes
    );

    return NextResponse.json({
      success: true,
      alert: updatedAlert,
    });
  } catch (error) {
    console.error('[DevilsAdvocate] Update alert error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
