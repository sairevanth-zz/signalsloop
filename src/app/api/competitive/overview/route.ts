/**
 * Competitive Intelligence Overview API
 * GET: Returns competitive dashboard overview data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/competitive/overview?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
    );

    // Get competitive overview stats
    const { data: overviewData, error: overviewError } = await supabase.rpc('get_competitive_overview', {
      p_project_id: projectId,
    });

    if (overviewError) {
      console.error('[Competitive Overview API] Error fetching overview:', overviewError);
      return NextResponse.json({ success: false, error: overviewError.message }, { status: 500 });
    }

    // Get top competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitive_dashboard_overview')
      .select('*')
      .eq('project_id', projectId)
      .order('total_mentions', { ascending: false })
      .limit(10);

    if (competitorsError) {
      console.error('[Competitive Overview API] Error fetching competitors:', competitorsError);
    }

    // Get top feature gaps
    const { data: featureGaps, error: gapsError } = await supabase
      .from('feature_gaps')
      .select('*')
      .eq('project_id', projectId)
      .neq('status', 'dismissed')
      .order('urgency_score', { ascending: false })
      .limit(5);

    if (gapsError) {
      console.error('[Competitive Overview API] Error fetching feature gaps:', gapsError);
    }

    // Get recent strategic recommendations
    const { data: recommendations, error: recsError } = await supabase
      .from('strategic_recommendations')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .limit(5);

    if (recsError) {
      console.error('[Competitive Overview API] Error fetching recommendations:', recsError);
    }

    // Get recent competitive activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('recent_competitive_activity')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (activityError) {
      console.error('[Competitive Overview API] Error fetching activity:', activityError);
    }

    // Calculate sentiment trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sentimentTrend, error: sentimentError } = await supabase
      .from('competitive_mentions')
      .select('created_at, sentiment_vs_you')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by date and calculate average
    const sentimentByDate: { [date: string]: { sum: number; count: number } } = {};
    sentimentTrend?.forEach((mention) => {
      const date = new Date(mention.created_at).toISOString().split('T')[0];
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = { sum: 0, count: 0 };
      }
      sentimentByDate[date].sum += mention.sentiment_vs_you || 0;
      sentimentByDate[date].count += 1;
    });

    const sentimentChartData = Object.entries(sentimentByDate).map(([date, data]) => ({
      date,
      avg_sentiment: data.sum / data.count,
      mention_count: data.count,
    }));

    return NextResponse.json({
      success: true,
      overview: overviewData?.[0] || null,
      competitors: competitors || [],
      topFeatureGaps: featureGaps || [],
      pendingRecommendations: recommendations || [],
      recentActivity: recentActivity || [],
      sentimentTrend: sentimentChartData,
    });
  } catch (error) {
    console.error('[Competitive Overview API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch competitive overview',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
