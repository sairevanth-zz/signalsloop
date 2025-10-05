import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withRateLimit } from '@/middleware/rate-limit';

// Initialize Supabase client with service role
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );
};

// API Key validation middleware
async function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  
  // Hash the API key for comparison
  const crypto = require('crypto');
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const supabase = getSupabaseClient();
  const { data: apiKeyData, error } = await supabase
    .from('api_keys')
    .select(`
      *,
      projects!inner(id, slug, name, plan, user_id)
    `)
    .eq('key_hash', hashedKey)
    .single();

  if (error || !apiKeyData) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true, project: apiKeyData.projects, apiKey: apiKeyData };
}

// GET /api/v1/stats - Get project statistics
export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => getHandler(request), 'api');
}

async function getHandler(request: NextRequest) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { project } = authResult;
    const supabase = getSupabaseClient();

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build date filter
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `and created_at >= '${startDate}' and created_at <= '${endDate}'`;
    }

    // Get total posts count
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('boards.project_id', project.id);

    // Get posts by status
    const { data: statusStats } = await supabase
      .from('posts')
      .select('status')
      .eq('boards.project_id', project.id);

    // Get posts by AI category
    const { data: categoryStats } = await supabase
      .from('posts')
      .select('ai_category')
      .eq('boards.project_id', project.id)
      .not('ai_category', 'is', null);

    // Get total votes
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('posts.boards.project_id', project.id);

    // Get total comments
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('posts.boards.project_id', project.id);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentPosts } = await supabase
      .from('posts')
      .select('created_at')
      .eq('boards.project_id', project.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: recentVotes } = await supabase
      .from('votes')
      .select('created_at')
      .eq('posts.boards.project_id', project.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Process status statistics
    const statusCounts = statusStats?.reduce((acc: any, post: any) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Process category statistics
    const categoryCounts = categoryStats?.reduce((acc: any, post: any) => {
      acc[post.ai_category] = (acc[post.ai_category] || 0) + 1;
      return acc;
    }, {}) || {};

    // Calculate AI categorization rate
    const categorizedPosts = Object.values(categoryCounts).reduce((sum: number, count: any) => sum + count, 0);
    const aiCategorizationRate = totalPosts ? (categorizedPosts / totalPosts * 100).toFixed(1) : 0;

    // Calculate average votes per post
    const avgVotesPerPost = totalPosts ? (totalVotes / totalPosts).toFixed(1) : 0;

    // Calculate average comments per post
    const avgCommentsPerPost = totalPosts ? (totalComments / totalPosts).toFixed(1) : 0;

    const stats = {
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        plan: project.plan
      },
      overview: {
        total_posts: totalPosts || 0,
        total_votes: totalVotes || 0,
        total_comments: totalComments || 0,
        ai_categorization_rate: `${aiCategorizationRate}%`,
        avg_votes_per_post: avgVotesPerPost,
        avg_comments_per_post: avgCommentsPerPost
      },
      posts_by_status: {
        open: statusCounts.open || 0,
        planned: statusCounts.planned || 0,
        in_progress: statusCounts.in_progress || 0,
        done: statusCounts.done || 0,
        closed: statusCounts.closed || 0
      },
      posts_by_category: categoryCounts,
      recent_activity: {
        posts_last_30_days: recentPosts?.length || 0,
        votes_last_30_days: recentVotes?.length || 0
      },
      generated_at: new Date().toISOString()
    };

    return NextResponse.json({ data: stats });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
