import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    // Fetch comments for this post
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, content, author_email, created_at')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/posts/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const body = await request.json();
    const { content, email } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        content: content.trim(),
        author_email: email || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

