/**
 * API Route: Analyze PRD with Devil's Advocate
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeProductRequirementsDocument } from '@/lib/devils-advocate';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for AI analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spec_id } = body;

    if (!spec_id) {
      return NextResponse.json(
        { error: 'spec_id is required' },
        { status: 400 }
      );
    }

    const result = await analyzeProductRequirementsDocument(spec_id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[DevilsAdvocate] Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze PRD' },
      { status: 500 }
    );
  }
}
