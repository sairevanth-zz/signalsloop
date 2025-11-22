/**
 * Weekly Insights API
 *
 * GET /api/insights/weekly?projectId=xxx
 * - Get latest weekly insight report
 *
 * POST /api/insights/weekly
 * - Generate new weekly insight report using Claude Sonnet 4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import {
  generateAndStoreWeeklyInsights,
} from '@/lib/predictions/insights-synthesizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Claude analysis can take longer

/**
 * GET - Fetch latest weekly insight report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();

    // Fetch latest weekly report
    const { data, error } = await supabase
      .from('insight_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_type', 'weekly')
      .order('report_period_end', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[INSIGHTS API] Error fetching report:', error);
      return NextResponse.json(
        { error: 'Failed to fetch insight report' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          report: null,
          message: 'No weekly report available. Generate one first.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      report: {
        id: data.id,
        periodStart: data.report_period_start,
        periodEnd: data.report_period_end,
        executiveSummary: data.executive_summary,
        keyInsights: data.key_insights,
        biggestWins: data.biggest_wins,
        criticalIssues: data.critical_issues,
        emergingTrends: data.emerging_trends,
        recommendedActions: data.recommended_actions,
        forecastedSentiment: data.forecasted_sentiment_next_week,
        churnRiskAlerts: data.churn_risk_alerts,
        totalFeedbackAnalyzed: data.total_feedback_analyzed,
        sentimentTrend: data.sentiment_trend,
        model: data.model_name,
        generationTime: data.generation_time_ms,
        tokenUsage: {
          input: data.token_usage_input,
          output: data.token_usage_output,
        },
        createdAt: data.created_at,
        isRead: data.is_read,
      },
    });
  } catch (error) {
    console.error('[INSIGHTS API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate new weekly insight report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    console.log(`[INSIGHTS API] Generating weekly insights for project ${projectId}`);

    const reportId = await generateAndStoreWeeklyInsights(projectId);

    // Fetch the generated report
    const supabase = getSupabaseServiceRoleClient();
    const { data: report, error } = await supabase
      .from('insight_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      throw new Error('Failed to fetch generated report');
    }

    return NextResponse.json({
      success: true,
      reportId,
      report: {
        id: report.id,
        periodStart: report.report_period_start,
        periodEnd: report.report_period_end,
        executiveSummary: report.executive_summary,
        keyInsights: report.key_insights,
        biggestWins: report.biggest_wins,
        criticalIssues: report.critical_issues,
        emergingTrends: report.emerging_trends,
        recommendedActions: report.recommended_actions,
        forecastedSentiment: report.forecasted_sentiment_next_week,
        churnRiskAlerts: report.churn_risk_alerts,
        totalFeedbackAnalyzed: report.total_feedback_analyzed,
        sentimentTrend: report.sentiment_trend,
        generationTime: report.generation_time_ms,
      },
    });
  } catch (error) {
    console.error('[INSIGHTS API] POST error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate insight report',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
