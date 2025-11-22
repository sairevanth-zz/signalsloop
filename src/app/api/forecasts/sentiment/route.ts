/**
 * Sentiment Forecasting API
 *
 * GET /api/forecasts/sentiment?projectId=xxx&horizon=7
 * - Get latest forecast for a project
 *
 * POST /api/forecasts/sentiment
 * - Generate new forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  generateSentimentForecast,
  storeSentimentForecast,
  generateAllForecasts,
} from '@/lib/predictions/sentiment-forecasting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch latest sentiment forecast
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const horizonParam = searchParams.get('horizon');
    const horizon = horizonParam ? parseInt(horizonParam) : 7;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();

    // Fetch latest forecast for this horizon
    const { data, error } = await supabase
      .from('sentiment_forecasts')
      .select('*')
      .eq('project_id', projectId)
      .eq('forecast_horizon', horizon)
      .order('forecast_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      console.error('[FORECAST API] Error fetching forecast:', error);
      return NextResponse.json(
        { error: 'Failed to fetch forecast' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          forecast: null,
          message: 'No forecast available. Generate one first.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      forecast: {
        id: data.id,
        forecastDate: data.forecast_date,
        targetDate: data.target_date,
        horizon: data.forecast_horizon,
        predictedSentiment: data.predicted_sentiment_score,
        confidenceLower: data.confidence_lower,
        confidenceUpper: data.confidence_upper,
        trendDirection: data.feature_trend_direction,
        model: data.model_name,
        trainingWindow: data.training_window_days,
        dataPoints: data.feature_volume,
        avgSentiment: data.feature_avg_sentiment,
        volatility: data.feature_sentiment_volatility,
      },
    });
  } catch (error) {
    console.error('[FORECAST API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate new sentiment forecast
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, horizon, generateAll } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // If generateAll is true, generate forecasts for all horizons (7, 14, 30 days)
    if (generateAll) {
      await generateAllForecasts(projectId);

      return NextResponse.json({
        success: true,
        message: 'All forecasts generated successfully',
      });
    }

    // Generate single forecast
    const forecastHorizon = (horizon || 7) as 7 | 14 | 30;

    if (![7, 14, 30].includes(forecastHorizon)) {
      return NextResponse.json(
        { error: 'horizon must be 7, 14, or 30' },
        { status: 400 }
      );
    }

    const result = await generateSentimentForecast({
      projectId,
      horizon: forecastHorizon,
      trainingWindowDays: 90,
    });

    const forecastId = await storeSentimentForecast(
      projectId,
      result.forecast,
      result.metadata,
      forecastHorizon
    );

    return NextResponse.json({
      success: true,
      forecastId,
      forecast: {
        targetDate: result.forecast.targetDate,
        predictedSentiment: result.forecast.predictedSentiment,
        confidenceLower: result.forecast.confidenceLower,
        confidenceUpper: result.forecast.confidenceUpper,
        trendDirection: result.forecast.trendDirection,
        reasoning: result.forecast.reasoning,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[FORECAST API] POST error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate forecast',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
