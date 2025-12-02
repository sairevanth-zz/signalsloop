/**
 * Outcome Report API
 *
 * Generates a detailed report for a specific outcome.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOutcomeReport } from '@/lib/outcome-attribution/generate-report';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Outcome ID is required' },
        { status: 400 }
      );
    }

    const report = await generateOutcomeReport(id);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[OutcomeReport] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate outcome report' },
      { status: 500 }
    );
  }
}
