/**
 * Win/Loss Overview API
 * GET: Returns comprehensive win/loss dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/deals/overview?projectId=xxx&days=30
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get overview stats using DB function
    const { data: overviewData, error: overviewError } = await supabase.rpc('get_deals_overview', {
      p_project_id: projectId,
      p_days_back: days,
    });

    if (overviewError) {
      console.error('[Deals Overview API] Error fetching overview:', overviewError);
      return NextResponse.json(
        { success: false, error: overviewError.message },
        { status: 500 }
      );
    }

    const overview = overviewData?.[0] || {};

    // Get deals breakdown with autopsies
    const { data: deals, error: dealsError } = await supabase
      .from('deals_dashboard_view')
      .select('*')
      .eq('project_id', projectId)
      .order('closed_at', { ascending: false, nullsFirst: false });

    if (dealsError) {
      console.error('[Deals Overview API] Error fetching deals:', dealsError);
    }

    // Get battlecards
    const { data: battlecards, error: battlecardsError } = await supabase
      .from('deal_battlecards')
      .select('*')
      .eq('project_id', projectId)
      .order('revenue_lost', { ascending: false })
      .limit(10);

    if (battlecardsError) {
      console.error('[Deals Overview API] Error fetching battlecards:', battlecardsError);
    }

    // Calculate revenue trend (last N days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const { data: revenueByDate, error: revenueError } = await supabase
      .from('deals')
      .select('closed_at, status, amount')
      .eq('project_id', projectId)
      .in('status', ['won', 'lost'])
      .gte('closed_at', daysAgo.toISOString())
      .order('closed_at', { ascending: true });

    // Group by date and status
    const revenueByDateMap: {
      [date: string]: { won: number; lost: number; count_won: number; count_lost: number };
    } = {};

    revenueByDate?.forEach((deal) => {
      const date = new Date(deal.closed_at).toISOString().split('T')[0];
      if (!revenueByDateMap[date]) {
        revenueByDateMap[date] = { won: 0, lost: 0, count_won: 0, count_lost: 0 };
      }
      if (deal.status === 'won') {
        revenueByDateMap[date].won += Number(deal.amount);
        revenueByDateMap[date].count_won += 1;
      } else if (deal.status === 'lost') {
        revenueByDateMap[date].lost += Number(deal.amount);
        revenueByDateMap[date].count_lost += 1;
      }
    });

    const revenueTrend = Object.entries(revenueByDateMap).map(([date, data]) => ({
      date,
      revenue_won: data.won,
      revenue_lost: data.lost,
      count_won: data.count_won,
      count_lost: data.count_lost,
    }));

    // Get loss reason breakdown for recent losses
    const { data: lossReasons, error: reasonsError } = await supabase
      .from('deal_autopsies')
      .select('primary_reason, deals!inner(id, amount, closed_at, status, project_id)')
      .eq('deals.project_id', projectId)
      .eq('deals.status', 'lost')
      .gte('deals.closed_at', daysAgo.toISOString());

    const reasonBreakdown: { [reason: string]: { count: number; revenue: number } } = {};

    lossReasons?.forEach((autopsy: any) => {
      const reason = autopsy.primary_reason || 'other';
      if (!reasonBreakdown[reason]) {
        reasonBreakdown[reason] = { count: 0, revenue: 0 };
      }
      reasonBreakdown[reason].count += 1;
      reasonBreakdown[reason].revenue += Number(autopsy.deals.amount);
    });

    const lossReasonChart = Object.entries(reasonBreakdown).map(([reason, data]) => ({
      reason,
      count: data.count,
      revenue: data.revenue,
    }));

    // Get deals needing autopsy
    const { data: dealsNeedingAutopsy, error: needAutopsyError } = await supabase
      .from('deals_dashboard_view')
      .select('id, name, amount, status, closed_at')
      .eq('project_id', projectId)
      .eq('needs_autopsy', true)
      .order('closed_at', { ascending: false })
      .limit(10);

    if (needAutopsyError) {
      console.error('[Deals Overview API] Error fetching deals needing autopsy:', needAutopsyError);
    }

    // Get at-risk open deals (from recent loss autopsies)
    const atRiskDealIds = new Set<string>();
    lossReasons?.forEach((autopsy: any) => {
      const similarIds = autopsy.similar_open_deal_ids || [];
      similarIds.forEach((id: string) => atRiskDealIds.add(id));
    });

    const { data: atRiskDeals, error: atRiskError } =
      atRiskDealIds.size > 0
        ? await supabase
            .from('deals')
            .select('id, name, amount, competitor, stage, created_at')
            .in('id', Array.from(atRiskDealIds))
            .order('amount', { ascending: false })
            .limit(10)
        : { data: [], error: null };

    if (atRiskError) {
      console.error('[Deals Overview API] Error fetching at-risk deals:', atRiskError);
    }

    return NextResponse.json({
      success: true,
      overview: {
        ...overview,
        days_analyzed: days,
      },
      deals: deals || [],
      battlecards: battlecards || [],
      revenue_trend: revenueTrend,
      loss_reasons: lossReasonChart,
      needs_autopsy: dealsNeedingAutopsy || [],
      at_risk_deals: atRiskDeals || [],
    });
  } catch (error) {
    console.error('[Deals Overview API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deals overview',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
