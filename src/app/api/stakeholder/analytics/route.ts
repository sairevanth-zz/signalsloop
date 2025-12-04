/**
 * Stakeholder Analytics API
 * Returns aggregated analytics and usage patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const timeRange = searchParams.get('timeRange') || '30d';

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

    // Calculate date range
    const days = parseInt(timeRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all queries in time range
    const { data: queries, error } = await supabase
      .from('stakeholder_queries')
      .select('user_role, generation_time_ms, rating, query_text, created_at')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    if (!queries || queries.length === 0) {
      return NextResponse.json({
        queryCountByRole: [],
        avgGenerationTime: 0,
        avgRating: 0,
        totalQueries: 0,
        popularQueries: [],
        timeDistribution: [],
        ratingDistribution: [],
        performanceByRole: []
      });
    }

    // 1. Queries by role
    const queryCountByRole: Record<string, number> = {};
    queries.forEach(q => {
      queryCountByRole[q.user_role] = (queryCountByRole[q.user_role] || 0) + 1;
    });

    // 2. Avg generation time
    const avgGenerationTime = queries.reduce((sum, q) => sum + (q.generation_time_ms || 0), 0) / queries.length;

    // 3. Avg rating
    const ratedQueries = queries.filter(q => q.rating);
    const avgRating = ratedQueries.length > 0
      ? ratedQueries.reduce((sum, q) => sum + (q.rating || 0), 0) / ratedQueries.length
      : 0;

    // 4. Popular queries
    const queryFrequency: Record<string, { count: number; totalRating: number; ratingCount: number }> = {};
    queries.forEach(q => {
      if (!queryFrequency[q.query_text]) {
        queryFrequency[q.query_text] = { count: 0, totalRating: 0, ratingCount: 0 };
      }
      queryFrequency[q.query_text].count++;
      if (q.rating) {
        queryFrequency[q.query_text].totalRating += q.rating;
        queryFrequency[q.query_text].ratingCount++;
      }
    });

    const popularQueries = Object.entries(queryFrequency)
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        rating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 5. Time distribution (by hour of day)
    const timeDistribution: Record<number, number> = {};
    queries.forEach(q => {
      const hour = new Date(q.created_at).getHours();
      timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
    });

    // 6. Rating distribution
    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    queries.forEach(q => {
      if (q.rating) {
        ratingDistribution[q.rating]++;
      }
    });

    // 7. Performance by role
    const performanceByRole: Record<string, { times: number[]; role: string }> = {};
    queries.forEach(q => {
      if (!performanceByRole[q.user_role]) {
        performanceByRole[q.user_role] = { times: [], role: q.user_role };
      }
      if (q.generation_time_ms) {
        performanceByRole[q.user_role].times.push(q.generation_time_ms);
      }
    });

    const performanceStats = Object.values(performanceByRole).map(({ role, times }) => {
      times.sort((a, b) => a - b);
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const p95Index = Math.floor(times.length * 0.95);
      const p95Time = times[p95Index] || times[times.length - 1];

      return {
        role,
        avgTime: Math.round(avgTime),
        p95Time: Math.round(p95Time)
      };
    });

    return NextResponse.json({
      queryCountByRole: Object.entries(queryCountByRole).map(([role, count]) => ({
        role,
        count
      })),
      avgGenerationTime: Math.round(avgGenerationTime),
      avgRating: Number(avgRating.toFixed(2)),
      totalQueries: queries.length,
      popularQueries,
      timeDistribution: Object.entries(timeDistribution).map(([hour, count]) => ({
        hour: parseInt(hour),
        count
      })),
      ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
        rating: parseInt(rating),
        count
      })),
      performanceByRole: performanceStats
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
