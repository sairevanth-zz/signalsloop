/**
 * AI Reasoning Layer - Single Trace API
 * Feature F: Gen 3
 * 
 * GET - Fetch a single reasoning trace by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReasoningTraceById } from '@/lib/reasoning/capture-reasoning';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Trace ID is required' },
        { status: 400 }
      );
    }

    const trace = await getReasoningTraceById(id);

    if (!trace) {
      return NextResponse.json(
        { error: 'Reasoning trace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ trace });
  } catch (error: any) {
    console.error('[ReasoningAPI] GET by ID error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reasoning trace' },
      { status: 500 }
    );
  }
}
