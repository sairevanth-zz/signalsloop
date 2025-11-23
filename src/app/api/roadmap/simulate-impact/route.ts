/**
 * Impact Simulation API
 *
 * POST /api/roadmap/simulate-impact
 * Simulates the impact of building or deprioritizing a feature
 */

import { NextResponse } from 'next/server';
import { simulateFeatureImpact, simulateDeprioritization, compareScenarios } from '@/lib/predictions/impact-simulation/simulator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, suggestionId, action, compareWith } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Comparison mode: compare multiple features
    if (compareWith && Array.isArray(compareWith)) {
      const suggestionIds = [suggestionId, ...compareWith];
      const comparison = await compareScenarios(projectId, suggestionIds);

      return NextResponse.json({
        success: true,
        mode: 'comparison',
        data: comparison
      });
    }

    // Single feature simulation
    if (!suggestionId) {
      return NextResponse.json(
        { error: 'suggestionId is required' },
        { status: 400 }
      );
    }

    let prediction;

    if (action === 'deprioritize') {
      prediction = await simulateDeprioritization(projectId, suggestionId);
    } else {
      prediction = await simulateFeatureImpact(projectId, suggestionId);
    }

    return NextResponse.json({
      success: true,
      mode: 'single',
      data: prediction
    });
  } catch (error) {
    console.error('[Impact Simulation API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
