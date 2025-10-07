import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSlug = searchParams.get('projectSlug');

    if (!projectSlug) {
      return NextResponse.json(
        { error: 'Project slug is required' },
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

    // First, get the project ID
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', projectSlug)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all posts for this project
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (postsError) {
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    const typedPosts = posts || [];
    const totalPosts = typedPosts.length;
    const categorizedPosts = typedPosts.filter(p => p.ai_categorized).length;
    const categorizationRate = totalPosts > 0 ? (categorizedPosts / totalPosts) * 100 : 0;

    const priorityTotals = typedPosts.reduce(
      (acc, post) => {
        acc.mustHave += post.must_have_votes || 0;
        acc.important += post.important_votes || 0;
        acc.niceToHave += post.nice_to_have_votes || 0;
        return acc;
      },
      { mustHave: 0, important: 0, niceToHave: 0 }
    );

    const priorityByPost = typedPosts
      .map((post) => {
        const mustHave = post.must_have_votes || 0;
        const important = post.important_votes || 0;
        const niceToHave = post.nice_to_have_votes || 0;
        const total = mustHave + important + niceToHave;

        return {
          id: post.id,
          title: post.title,
          status: post.status,
          mustHave,
          important,
          niceToHave,
          total,
          timeframe: post.created_at,
        };
      })
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.mustHave - a.mustHave)
      .slice(0, 12);

    // Calculate category breakdown
    const categoryCounts = typedPosts.reduce((acc: Record<string, number>, post) => {
      if (post.category) {
        acc[post.category] = (acc[post.category] || 0) + 1;
      }
      return acc;
    }, {});

    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalPosts > 0 ? (count / totalPosts) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    const topCategory = categoryBreakdown[0]?.category || 'None';

    // Calculate average confidence
    const confidenceValues = typedPosts
      .filter(p => p.ai_confidence !== null && p.ai_confidence !== undefined)
      .map(p => p.ai_confidence);
    const averageConfidence = confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length 
      : 0;

    // Estimate time saved (2 minutes per categorized post)
    const timeSaved = categorizedPosts * 2;

    // Generate recent trends (last 7 days)
    const now = new Date();
    const recentTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPosts = typedPosts.filter(p => 
        p.created_at && p.created_at.startsWith(dateStr)
      );
      
      return {
        date: dateStr,
        total: dayPosts.length,
        categorized: dayPosts.filter(p => p.ai_categorized).length
      };
    }).reverse();

    // Calculate sentiment breakdown (mock data for now - would need actual sentiment analysis)
    // In real implementation, you'd analyze post titles/descriptions for sentiment
    const sentimentBreakdown = {
      positive: Math.round(totalPosts * 0.45), // 45% positive
      neutral: Math.round(totalPosts * 0.35),  // 35% neutral
      negative: Math.round(totalPosts * 0.15), // 15% negative
      mixed: Math.round(totalPosts * 0.05)     // 5% mixed
    };

    const weeklySnapshots = Array.from({ length: 6 }, (_, index) => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - index * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const inRange = (dateString?: string | null) => {
        if (!dateString) return false;
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return false;
        return parsed >= weekStart && parsed < weekEnd;
      };

      const windowPosts = typedPosts.filter((post) => inRange(post.created_at));
      const windowTotals = windowPosts.reduce(
        (acc, post) => {
          acc.mustHave += post.must_have_votes || 0;
          acc.important += post.important_votes || 0;
          acc.niceToHave += post.nice_to_have_votes || 0;
          return acc;
        },
        { mustHave: 0, important: 0, niceToHave: 0 }
      );

      return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        ...windowTotals,
      };
    }).reverse();
    
    const insights = {
      totalPosts,
      categorizedPosts,
      categorizationRate,
      topCategory,
      categoryBreakdown,
      timeSaved,
      averageConfidence,
      recentTrends,
      sentimentBreakdown,
      prioritySummary: {
        totals: priorityTotals,
        posts: priorityByPost,
        weeklySnapshots,
      }
    };

    return NextResponse.json(insights);

  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
