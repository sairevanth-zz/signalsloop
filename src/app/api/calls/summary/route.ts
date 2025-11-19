/**
 * Call Summary API
 * GET /api/calls/summary?projectId=xxx
 *
 * Returns:
 * - Top insights and metrics
 * - Expansion/churn revenue estimates
 * - Top objections and competitors
 * - Feature frequency data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface FeatureRequest {
  title: string;
  count: number;
  total_arr?: number;
}

interface Objection {
  type: string;
  count: number;
  severity?: string;
}

interface Competitor {
  name: string;
  mentions: number;
  context?: string;
}

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

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch all call records for this project
    const { data: callRecords, error: recordsError } = await supabase
      .from('call_records')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('[Calls Summary] Error fetching records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch call records' },
        { status: 500 }
      );
    }

    if (!callRecords || callRecords.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          total_calls: 0,
          analyzed_calls: 0,
          expansion_revenue: 0,
          churn_risk_revenue: 0,
          avg_sentiment: 0,
          top_objections: [],
          top_competitors: [],
          feature_frequency: [],
          top_insights: [],
        },
      });
    }

    // Calculate metrics
    const analyzedCalls = callRecords.filter((r) => r.analyzed_at);
    const totalCalls = callRecords.length;

    // Expansion/Churn revenue
    let expansionRevenue = 0;
    let churnRiskRevenue = 0;

    callRecords.forEach((record) => {
      if (record.amount) {
        const expansionScore = record.expansion_signals?.score || 0;
        const churnScore = record.churn_signals?.score || 0;

        if (expansionScore > 50) {
          expansionRevenue += Number(record.amount);
        }
        if (churnScore > 50) {
          churnRiskRevenue += Number(record.amount);
        }
      }
    });

    // Average sentiment
    const sentiments = callRecords
      .filter((r) => r.sentiment !== null && r.sentiment !== undefined)
      .map((r) => Number(r.sentiment));
    const avgSentiment =
      sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

    // Aggregate objections
    const objectionsMap = new Map<string, { count: number; severity: string }>();
    callRecords.forEach((record) => {
      if (record.objections && Array.isArray(record.objections)) {
        record.objections.forEach((obj: any) => {
          const type = obj.type || 'Unknown';
          const existing = objectionsMap.get(type) || { count: 0, severity: obj.severity || 'medium' };
          objectionsMap.set(type, {
            count: existing.count + 1,
            severity: obj.severity || existing.severity,
          });
        });
      }
    });

    const topObjections: Objection[] = Array.from(objectionsMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        severity: data.severity,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Aggregate competitors
    const competitorsMap = new Map<string, number>();
    callRecords.forEach((record) => {
      if (record.competitors && Array.isArray(record.competitors)) {
        record.competitors.forEach((comp: any) => {
          const name = comp.name || comp.competitor || 'Unknown';
          competitorsMap.set(name, (competitorsMap.get(name) || 0) + 1);
        });
      }
    });

    const topCompetitors: Competitor[] = Array.from(competitorsMap.entries())
      .map(([name, mentions]) => ({ name, mentions }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);

    // Aggregate feature requests
    const featuresMap = new Map<string, { count: number; total_arr: number }>();
    callRecords.forEach((record) => {
      if (record.feature_requests && Array.isArray(record.feature_requests)) {
        record.feature_requests.forEach((feature: any) => {
          const title = feature.title || feature.feature || 'Unknown';
          const existing = featuresMap.get(title) || { count: 0, total_arr: 0 };
          featuresMap.set(title, {
            count: existing.count + 1,
            total_arr: existing.total_arr + (record.amount ? Number(record.amount) : 0),
          });
        });
      }
    });

    const featureFrequency: FeatureRequest[] = Array.from(featuresMap.entries())
      .map(([title, data]) => ({
        title,
        count: data.count,
        total_arr: data.total_arr,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate top insights
    const topInsights: string[] = [];

    if (expansionRevenue > 0) {
      topInsights.push(
        `$${expansionRevenue.toLocaleString()} in potential expansion revenue identified across ${callRecords.filter(r => r.expansion_signals?.score > 50).length} calls`
      );
    }

    if (churnRiskRevenue > 0) {
      topInsights.push(
        `$${churnRiskRevenue.toLocaleString()} at churn risk based on ${callRecords.filter(r => r.churn_signals?.score > 50).length} calls with negative signals`
      );
    }

    if (topObjections.length > 0) {
      topInsights.push(
        `Most common objection: "${topObjections[0].type}" appeared in ${topObjections[0].count} calls`
      );
    }

    if (topCompetitors.length > 0) {
      topInsights.push(
        `${topCompetitors[0].name} mentioned in ${topCompetitors[0].mentions} calls as primary competitor`
      );
    }

    if (featureFrequency.length > 0) {
      topInsights.push(
        `Top feature request: "${featureFrequency[0].title}" mentioned ${featureFrequency[0].count} times`
      );
    }

    if (avgSentiment > 0.3) {
      topInsights.push(
        `Overall positive sentiment (${(avgSentiment * 100).toFixed(0)}%) across analyzed calls`
      );
    } else if (avgSentiment < -0.3) {
      topInsights.push(
        `Concerning negative sentiment (${(avgSentiment * 100).toFixed(0)}%) detected - requires attention`
      );
    }

    // Fetch ingest statistics
    const { data: ingestStats } = await supabase
      .from('call_ingests')
      .select('status, total_calls, processed_calls')
      .eq('project_id', projectId);

    const pendingProcessing = ingestStats?.some((i) => i.status === 'pending' || i.status === 'processing');

    return NextResponse.json({
      success: true,
      summary: {
        total_calls: totalCalls,
        analyzed_calls: analyzedCalls.length,
        pending_processing: pendingProcessing || false,
        expansion_revenue: expansionRevenue,
        churn_risk_revenue: churnRiskRevenue,
        avg_sentiment: avgSentiment,
        top_objections: topObjections,
        top_competitors: topCompetitors,
        feature_frequency: featureFrequency,
        top_insights: topInsights.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('[Calls Summary] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
