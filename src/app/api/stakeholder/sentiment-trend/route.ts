/**
 * Sentiment Trend API
 * Fetches historical sentiment data and triggers backfill if needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');
    const autoBackfill = searchParams.get('autoBackfill') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have sentiment history data
    const { data: existingData, error: checkError } = await supabase
      .from('sentiment_history')
      .select('date')
      .eq('project_id', projectId)
      .limit(1);

    if (checkError) throw checkError;

    // If no data exists and autoBackfill is enabled, trigger backfill
    if ((!existingData || existingData.length === 0) && autoBackfill) {
      console.log('[Sentiment Trend] No historical data found, triggering backfill...');

      const { error: backfillError } = await supabase.rpc('backfill_sentiment_history', {
        p_project_id: projectId,
        p_days_back: days
      });

      if (backfillError) {
        console.error('[Sentiment Trend] Backfill error:', backfillError);
        // Don't throw, continue with empty data
      }
    }

    // Fetch sentiment trend data
    const { data: trendData, error: trendError } = await supabase.rpc('get_sentiment_trend', {
      p_project_id: projectId,
      p_days: days
    });

    if (trendError) throw trendError;

    // Transform data for frontend
    const formattedData = (trendData || []).map((item: any) => ({
      date: item.date,
      value: parseFloat(item.avg_sentiment || 0),
      posts: item.total_posts || 0
    }));

    return NextResponse.json({
      trend: formattedData,
      hasData: formattedData.length > 0,
      dataPoints: formattedData.length
    });
  } catch (error) {
    console.error('[Sentiment Trend API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sentiment trend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, daysBack = 90 } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Trigger backfill
    const { data: daysProcessed, error } = await supabase.rpc('backfill_sentiment_history', {
      p_project_id: projectId,
      p_days_back: daysBack
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      daysProcessed,
      message: `Successfully backfilled ${daysProcessed} days of sentiment data`
    });
  } catch (error) {
    console.error('[Sentiment Backfill API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to backfill sentiment data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
