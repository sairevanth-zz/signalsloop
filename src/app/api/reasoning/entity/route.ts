/**
 * AI Reasoning Layer - Entity API
 * Feature F: Gen 3
 * 
 * GET - Fetch reasoning traces for a specific entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReasoningForEntity } from '@/lib/reasoning/capture-reasoning';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const traces = await getReasoningForEntity(entityType, entityId);

    return NextResponse.json({ traces });
  } catch (error: any) {
    console.error('[ReasoningAPI] Entity GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reasoning traces' },
      { status: 500 }
    );
  }
}
