import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSlug = searchParams.get('project_slug');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    if (!projectSlug) {
      return NextResponse.json({ error: 'Project slug is required' }, { status: 400 });
    }

    // Find the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', projectSlug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_name,
        author_email,
        status
      `)
      .eq('project_id', project.id)
      .eq('status', 'open');

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'vote_count', 'title'];
    const validOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sort) && validOrders.includes(order)) {
      query = query.order(sort, { ascending: order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply limit
    query = query.limit(Math.min(limit, 50)); // Max 50 posts

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get client IP for vote status
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    // Check which posts the user has voted on
    const postIds = posts?.map(post => post.id) || [];
    let userVotes: any[] = [];

    if (postIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('ip_address', clientIp);
      
      userVotes = votes || [];
    }

    const votedPostIds = new Set(userVotes.map(vote => vote.post_id));

    // Add vote status to posts
    const postsWithVoteStatus = posts?.map(post => ({
      ...post,
      user_voted: votedPostIds.has(post.id)
    })) || [];

    return NextResponse.json({
      posts: postsWithVoteStatus,
      total: posts?.length || 0,
      project_slug: projectSlug
    });

  } catch (error) {
    console.error('Posts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}