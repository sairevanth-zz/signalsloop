/**
 * Outcome Summary API
 *
 * Returns summary statistics for project outcomes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectOutcomeSummary } from '@/lib/outcome-attribution/generate-report';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const summary = await getProjectOutcomeSummary(projectId);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[OutcomeSummary] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outcome summary' },
      { status: 500 }
    );
  }
}
