/**
 * Experiments API
 *
 * GET /api/experiments?projectId=xxx - List all experiments for a project
 * POST /api/experiments - Create new experiment
 *
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';

/**
 * GET - List experiments for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // Optional filter

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Get experiments with stats
    const { data, error } = await supabase
      .rpc('get_project_experiments_by_status', {
        p_project_id: projectId,
        p_status: status,
      });

    if (error) {
      console.error('[Experiments API] Error fetching experiments:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      experiments: data || [],
    });
  } catch (error) {
    console.error('[Experiments API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new experiment (manual or from saved design)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      description,
      hypothesis,
      expectedOutcome,
      experimentType = 'ab_test',
      controlDescription,
      treatmentDescription,
      primaryMetric,
      secondaryMetrics = [],
      successCriteria,
      sampleSizeTarget,
      minimumDetectableEffect,
      variants = [],
      createdBy,
    } = body;

    // Validate required fields
    if (!projectId || !name || !hypothesis || !primaryMetric) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, hypothesis, primaryMetric' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Create experiment
    const { data, error } = await supabase
      .from('experiments')
      .insert({
        project_id: projectId,
        name,
        description,
        hypothesis,
        expected_outcome: expectedOutcome,
        experiment_type: experimentType,
        control_description: controlDescription,
        treatment_description: treatmentDescription,
        primary_metric: primaryMetric,
        secondary_metrics: secondaryMetrics,
        success_criteria: successCriteria,
        sample_size_target: sampleSizeTarget,
        minimum_detectable_effect: minimumDetectableEffect,
        statistical_power: 0.8,
        confidence_level: 0.95,
        status: 'draft',
        variants: variants.length > 0 ? variants : null,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Experiments API] Error creating experiment:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      experiment: data,
    }, { status: 201 });
  } catch (error) {
    console.error('[Experiments API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
