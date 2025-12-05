/**
 * Feature Success Prediction API
 *
 * POST /api/predictions - Generate prediction for a spec/feature
 * GET /api/predictions?projectId=<id> - Get all predictions for a project
 * GET /api/predictions/<id> - Get a specific prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { extractFeaturesFromSpec } from '@/lib/predictions/extract-features';
import { predictFeatureSuccess } from '@/lib/predictions/predict-success';
import { createReasoningTrace } from '@/lib/reasoning/capture-reasoning';
import type { GeneratePredictionRequest, GeneratePredictionResponse } from '@/types/prediction';
import { z } from 'zod';

const supabaseService = getServiceRoleClient();

// Validation schema
const PredictionRequestSchema = z.object({
  project_id: z.string().uuid(),
  spec_id: z.string().uuid().optional(),
  feature_name: z.string().min(1),
  feature_description: z.string().optional(),
});

/**
 * GET - Retrieve predictions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const predictionId = searchParams.get('id');

    if (predictionId) {
      // Get specific prediction
      const { data: prediction, error } = await supabaseService
        .from('feature_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
      }

      return NextResponse.json({ prediction });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Verify user has access to project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get all predictions for project
    const { data: predictions, error } = await supabaseService
      .from('feature_predictions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch predictions:', error);
      return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('GET /api/predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Generate new prediction
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validated = PredictionRequestSchema.parse(body);

    // Verify user has access to project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', validated.project_id)
      .eq('owner_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // If spec_id provided, verify it exists
    if (validated.spec_id) {
      const { data: spec } = await supabaseService
        .from('specs')
        .select('id')
        .eq('id', validated.spec_id)
        .eq('project_id', validated.project_id)
        .single();

      if (!spec) {
        return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
      }
    }

    console.log('[Predictions API] Generating prediction for:', validated.feature_name);

    // 1. Extract features from spec
    let features;
    try {
      if (validated.spec_id) {
        features = await extractFeaturesFromSpec(validated.spec_id, validated.project_id);
      } else {
        // If no spec_id, we need to provide default features
        // This is a simplified version - ideally should extract from description
        features = {
          feature_category: 'enhancement' as const,
          target_segment: 'all' as const,
          problem_clarity_score: 0.6,
          solution_specificity_score: 0.6,
          feedback_volume: 0,
          feedback_intensity: 0.5,
          theme_concentration: 0.5,
          requester_arr_total: 0,
          enterprise_requester_pct: 0.5,
          competitor_has_feature: false,
          competitor_advantage_months: 0,
          estimated_effort_weeks: 4,
          technical_complexity: 'medium' as const,
          has_clear_success_metric: false,
          addresses_churn_theme: false,
          addresses_expansion_theme: false,
        };
      }
    } catch (error) {
      console.error('Feature extraction failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to extract features',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 2. Generate prediction
    let prediction;
    try {
      prediction = await predictFeatureSuccess(validated.project_id, features);
    } catch (error) {
      console.error('Prediction generation failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate prediction',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 3. Store in database
    const { data: savedPrediction, error: saveError } = await supabaseService
      .from('feature_predictions')
      .insert({
        project_id: validated.project_id,
        spec_id: validated.spec_id || null,
        feature_name: validated.feature_name,
        feature_description: validated.feature_description || null,

        predicted_adoption_rate: prediction.predicted_adoption_rate,
        predicted_sentiment_impact: prediction.predicted_sentiment_impact,
        predicted_revenue_impact: prediction.predicted_revenue_impact,
        predicted_churn_reduction: prediction.predicted_churn_reduction,

        confidence_score: prediction.confidence_score,
        confidence_interval_low: prediction.confidence_interval_low,
        confidence_interval_high: prediction.confidence_interval_high,

        input_features: features,
        explanation_text: prediction.explanation_text,
        explanation_factors: prediction.explanation_factors,

        prediction_strategy: prediction.prediction_strategy,
        strategy_metadata: prediction.strategy_metadata,

        similar_feature_ids: prediction.similar_feature_ids,

        model_name: 'gpt-4o',
        model_version: '2024-11',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save prediction:', saveError);
      return NextResponse.json({ error: 'Failed to save prediction' }, { status: 500 });
    }

    console.log('[Predictions API] Prediction generated successfully:', savedPrediction.id);

    // 4. Capture reasoning trace for transparency
    try {
      await createReasoningTrace({
        projectId: validated.project_id,
        feature: 'prediction',
        decisionType: 'feature_success_prediction',
        decisionSummary: `Predicted ${Math.round(prediction.predicted_adoption_rate * 100)}% adoption for "${validated.feature_name}"`,
        dataSources: [
          { type: 'feature_inputs', count: Object.keys(features).length },
          { type: 'historical_outcomes', count: prediction.strategy_metadata?.historical_outcomes_count || 0 },
          { type: 'similar_features', count: prediction.similar_feature_ids?.length || 0 },
        ],
        reasoningSteps: [
          {
            step_number: 1,
            description: 'Feature Analysis',
            conclusion: `Analyzed feature category (${features.feature_category}), target segment (${features.target_segment}), and complexity (${features.technical_complexity})`,
            confidence: 0.9,
            evidence: [
              `Category: ${features.feature_category}`,
              `Target: ${features.target_segment}`,
              `Complexity: ${features.technical_complexity}`,
              `Effort: ${features.estimated_effort_weeks} weeks`,
            ],
          },
          {
            step_number: 2,
            description: 'Historical Pattern Matching',
            conclusion: `Compared against ${prediction.strategy_metadata?.historical_outcomes_count || 0} historical features using ${prediction.prediction_strategy} strategy`,
            confidence: prediction.confidence_score,
            evidence: [
              `Strategy: ${prediction.prediction_strategy}`,
              `Similar features found: ${prediction.similar_feature_ids?.length || 0}`,
            ],
          },
          {
            step_number: 3,
            description: 'Adoption Prediction',
            conclusion: `Calculated adoption rate of ${Math.round(prediction.predicted_adoption_rate * 100)}% with confidence interval ${Math.round(prediction.confidence_interval_low * 100)}-${Math.round(prediction.confidence_interval_high * 100)}%`,
            confidence: prediction.confidence_score,
            evidence: prediction.explanation_factors?.map((f: { factor: string; impact: string }) => `${f.factor}: ${f.impact}`) || [],
          },
        ],
        decision: `${Math.round(prediction.predicted_adoption_rate * 100)}% predicted adoption rate`,
        confidence: prediction.confidence_score,
        alternatives: [
          {
            alternative: 'Heuristic-only scoring',
            why_rejected: prediction.prediction_strategy !== 'heuristic' 
              ? 'Hybrid strategy provided better confidence with historical data'
              : 'Used as primary strategy due to limited historical data',
          },
        ],
        modelUsed: 'gpt-4o',
        entityType: 'prediction',
        entityId: savedPrediction.id,
        triggeredBy: user.id,
      });
      console.log('[Predictions API] Reasoning trace captured for prediction:', savedPrediction.id);
    } catch (reasoningError) {
      // Don't fail the request if reasoning capture fails
      console.error('[Predictions API] Failed to capture reasoning:', reasoningError);
    }

    const response: GeneratePredictionResponse = {
      success: true,
      prediction: savedPrediction,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/predictions error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
