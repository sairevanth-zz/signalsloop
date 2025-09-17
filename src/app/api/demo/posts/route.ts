import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Fetch demo posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        status,
        author_email,
        created_at
      `)
      .eq('board_id', '00000000-0000-0000-0000-000000000001')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching demo posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch demo posts' },
        { status: 500 }
      );
    }

    // Fetch vote counts and comments for each post
    const postsWithDetails = await Promise.all(
      (postsData || []).map(async (post) => {
        const { data: votesData } = await supabase
          .from('votes')
          .select('id')
          .eq('post_id', post.id);

        const { data: commentsData } = await supabase
          .from('comments')
          .select('id')
          .eq('post_id', post.id);

        return {
          id: post.id,
          title: post.title,
          description: post.description,
          status: post.status,
          vote_count: votesData?.length || 0,
          user_voted: false, // Demo mode - no real voting
          author: post.author_email?.split('@')[0] || 'Demo User',
          created_at: post.created_at,
          comments_count: commentsData?.length || 0
        };
      })
    );

    return NextResponse.json({ posts: postsWithDetails });
  } catch (error) {
    console.error('Error in demo posts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
