import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { board_id, title, description, status, author_email, votes, created_at } = body;

    // Validate required fields
    if (!board_id || !title?.trim()) {
      return NextResponse.json(
        { error: 'Board ID and title are required' },
        { status: 400 }
      );
    }

    // Prepare post data
    const postData: any = {
      board_id,
      title: title.trim(),
      description: description?.trim() || null,
      status: status || 'open',
      author_email: author_email?.trim() || null,
      created_at: created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert the post
    const { data: post, error } = await supabase
      .from('posts')
      .insert([postData])
      .select('id, title, status, created_at')
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json(
        { error: 'Failed to create post', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: post.id,
      title: post.title,
      status: post.status,
      created_at: post.created_at
    });

  } catch (error) {
    console.error('Import post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
