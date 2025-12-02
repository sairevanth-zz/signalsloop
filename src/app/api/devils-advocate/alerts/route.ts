/**
 * API Route: Get Risk Alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRiskAlertsForSpec, getRiskAlertsSummary } from '@/lib/devils-advocate';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const specId = searchParams.get('specId');
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action');

    if (action === 'summary' && projectId) {
      const summary = await getRiskAlertsSummary(projectId);
      return NextResponse.json({ success: true, summary });
    }

    if (specId) {
      const alerts = await getRiskAlertsForSpec(specId);
      return NextResponse.json({ success: true, alerts });
    }

    return NextResponse.json(
      { error: 'specId or projectId (with action=summary) required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[DevilsAdvocate] Get alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to get risk alerts' },
      { status: 500 }
    );
  }
}
