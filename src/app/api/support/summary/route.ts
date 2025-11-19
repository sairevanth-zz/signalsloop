import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/support/summary?projectId=xxx&days=30
 * Returns analytics summary for support tickets
 *
 * Returns:
 * - Top themes with ticket counts
 * - Sentiment trend over time
 * - ARR at risk (sum of ARR for negative sentiment tickets)
 * - Top 5 gaps/priority themes
 * - Ticket volume by source
 * - Recent unanalyzed ticket count
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    console.log(`[SUPPORT SUMMARY] Generating summary for project ${projectId}, last ${days} days`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Get top themes from support tickets
    const { data: themeStats, error: themeError } = await supabase
      .from('support_tickets')
      .select(`
        theme_id,
        sentiment_score,
        arr_value,
        themes(theme_name, description)
      `)
      .eq('project_id', projectId)
      .not('theme_id', 'is', null)
      .gte('created_at', startDate.toISOString());

    // Aggregate theme statistics
    const themeMap = new Map<string, {
      theme_id: string;
      theme_name: string;
      description: string;
      count: number;
      avg_sentiment: number;
      arr_at_risk: number;
      sentiment_scores: number[];
    }>();

    if (themeStats) {
      for (const ticket of themeStats) {
        if (!ticket.theme_id || !ticket.themes) continue;

        const themeId = ticket.theme_id;
        if (!themeMap.has(themeId)) {
          themeMap.set(themeId, {
            theme_id: themeId,
            theme_name: (ticket.themes as any).theme_name,
            description: (ticket.themes as any).description,
            count: 0,
            avg_sentiment: 0,
            arr_at_risk: 0,
            sentiment_scores: [],
          });
        }

        const theme = themeMap.get(themeId)!;
        theme.count++;

        if (ticket.sentiment_score !== null && ticket.sentiment_score !== undefined) {
          theme.sentiment_scores.push(ticket.sentiment_score);

          // Count ARR at risk for negative sentiment (< -0.3)
          if (ticket.sentiment_score < -0.3 && ticket.arr_value) {
            theme.arr_at_risk += ticket.arr_value;
          }
        }
      }
    }

    // Calculate average sentiment for each theme
    const topThemes = Array.from(themeMap.values())
      .map(theme => ({
        ...theme,
        avg_sentiment: theme.sentiment_scores.length > 0
          ? theme.sentiment_scores.reduce((a, b) => a + b, 0) / theme.sentiment_scores.length
          : 0,
        sentiment_scores: undefined, // Remove raw scores from response
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 themes

    // 2. Get sentiment trend over time
    const { data: sentimentTrend, error: sentimentError } = await supabase
      .from('support_tickets')
      .select('created_at, sentiment_score, sentiment_category')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .not('sentiment_score', 'is', null)
      .order('created_at', { ascending: true });

    // Group by day
    const dailySentiment: Record<string, {
      date: string;
      avg_sentiment: number;
      positive: number;
      negative: number;
      neutral: number;
      total: number;
    }> = {};

    if (sentimentTrend) {
      for (const ticket of sentimentTrend) {
        const date = new Date(ticket.created_at).toISOString().split('T')[0];

        if (!dailySentiment[date]) {
          dailySentiment[date] = {
            date,
            avg_sentiment: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
            total: 0,
          };
        }

        const day = dailySentiment[date];
        day.total++;
        day.avg_sentiment += ticket.sentiment_score || 0;

        // Count by category
        if (ticket.sentiment_category === 'positive') day.positive++;
        else if (ticket.sentiment_category === 'negative') day.negative++;
        else day.neutral++;
      }

      // Calculate averages
      Object.values(dailySentiment).forEach(day => {
        if (day.total > 0) {
          day.avg_sentiment = day.avg_sentiment / day.total;
        }
      });
    }

    const sentimentTrendArray = Object.values(dailySentiment)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Calculate ARR at risk
    const { data: arrRiskData, error: arrError } = await supabase
      .from('support_tickets')
      .select('arr_value, sentiment_score')
      .eq('project_id', projectId)
      .not('arr_value', 'is', null)
      .lt('sentiment_score', -0.3); // Negative sentiment threshold

    const totalArrAtRisk = arrRiskData
      ? arrRiskData.reduce((sum, ticket) => sum + (ticket.arr_value || 0), 0)
      : 0;

    // 4. Get ticket volume by source
    const { data: volumeBySource, error: volumeError } = await supabase
      .from('support_tickets')
      .select('ingest_id, support_ingests(source)')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString());

    const sourceVolume: Record<string, number> = {};
    if (volumeBySource) {
      for (const ticket of volumeBySource) {
        const source = (ticket.support_ingests as any)?.source || 'unknown';
        sourceVolume[source] = (sourceVolume[source] || 0) + 1;
      }
    }

    // 5. Get unanalyzed ticket count
    const { count: unanalyzedCount } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('analyzed_at', null);

    // 6. Get total ticket count
    const { count: totalTickets } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // 7. Identify top 5 gaps (high frequency + negative sentiment + high ARR)
    const topGaps = topThemes
      .filter(theme => theme.avg_sentiment < 0) // Only negative themes
      .map(theme => ({
        ...theme,
        priority_score: (
          theme.count * 0.4 + // Frequency weight
          Math.abs(theme.avg_sentiment) * 30 * 0.3 + // Sentiment weight (scaled to ~30)
          (theme.arr_at_risk / 10000) * 0.3 // ARR weight (scaled)
        ),
      }))
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 5);

    // 8. Get recent high-priority tickets
    const { data: highPriorityTickets, error: priorityError } = await supabase
      .from('support_tickets')
      .select(`
        id,
        subject,
        customer,
        plan,
        arr_value,
        sentiment_score,
        priority_score,
        created_at,
        themes(theme_name)
      `)
      .eq('project_id', projectId)
      .not('priority_score', 'is', null)
      .order('priority_score', { ascending: false })
      .limit(10);

    console.log(`[SUPPORT SUMMARY] Generated summary: ${totalTickets} tickets, ${topThemes.length} themes, $${totalArrAtRisk.toFixed(2)} ARR at risk`);

    return NextResponse.json({
      success: true,
      summary: {
        overview: {
          total_tickets: totalTickets || 0,
          unanalyzed_tickets: unanalyzedCount || 0,
          total_arr_at_risk: totalArrAtRisk,
          date_range: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days,
          },
        },
        top_themes: topThemes,
        top_gaps: topGaps,
        sentiment_trend: sentimentTrendArray,
        volume_by_source: sourceVolume,
        high_priority_tickets: highPriorityTickets || [],
      },
    });

  } catch (error) {
    console.error('[SUPPORT SUMMARY] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate support summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
