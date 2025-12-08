/**
 * AI Reasoning Layer API
 * Feature F: Gen 3
 * 
 * GET - Fetch reasoning traces for a project
 * POST - Create a new reasoning trace
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getProjectReasoningTraces,
  createReasoningTrace,
} from '@/lib/reasoning/capture-reasoning';
import { ReasoningFeature } from '@/types/reasoning';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const feature = searchParams.get('feature') as ReasoningFeature | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const traces = await getProjectReasoningTraces(
      projectId,
      feature || undefined,
      limit
    );

    return NextResponse.json({ traces });
  } catch (error: any) {
    console.error('[ReasoningAPI] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reasoning traces' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      feature,
      decisionType,
      decisionSummary,
      dataSources,
      reasoningSteps,
      decision,
      confidence,
      alternatives,
      modelUsed,
      tokensUsed,
      latencyMs,
      entityType,
      entityId,
      triggeredBy,
    } = body;

    // Validate required fields
    if (!feature || !decisionType || !decisionSummary || !reasoningSteps) {
      return NextResponse.json(
        { error: 'feature, decisionType, decisionSummary, and reasoningSteps are required' },
        { status: 400 }
      );
    }

    const trace = await createReasoningTrace({
      projectId,
      feature,
      decisionType,
      decisionSummary,
      dataSources: dataSources || [],
      reasoningSteps,
      decision: decision || decisionSummary,
      confidence: confidence || 0.8,
      alternatives,
      modelUsed,
      tokensUsed,
      latencyMs,
      entityType,
      entityId,
      triggeredBy,
    });

    return NextResponse.json({ trace });
  } catch (error: any) {
    console.error('[ReasoningAPI] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create reasoning trace' },
      { status: 500 }
    );
  }
}
