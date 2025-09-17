import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

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

    const insights = {
      totalPosts,
      categorizedPosts,
      categorizationRate,
      topCategory,
      categoryBreakdown,
      timeSaved,
      averageConfidence,
      recentTrends
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
