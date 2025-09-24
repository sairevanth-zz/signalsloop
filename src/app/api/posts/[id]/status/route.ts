import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;
    const postId = params.id;

    if (!status || !['open', 'planned', 'in_progress', 'done', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update the post status
    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('Error updating post status:', error);
      return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      post: updatedPost
    });

  } catch (error) {
    console.error('Post status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;

    // Get the current post status
    const { data: post, error } = await supabase
      .from('posts')
      .select('id, status, title, updated_at')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post status:', error);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({
      post: {
        id: post.id,
        status: post.status,
        title: post.title,
        updated_at: post.updated_at
      }
    });

  } catch (error) {
    console.error('Post status fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
