import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const { postId, content, authorName, authorEmail, isAnonymous = true } = await request.json();

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Content must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Check if post exists and belongs to a public project
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        projects!inner(id, is_private)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.projects.is_private) {
      return NextResponse.json(
        { error: 'Cannot add feedback to private project posts' },
        { status: 403 }
      );
    }

    // Get client IP and user agent for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Basic rate limiting: max 5 feedback submissions per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: recentFeedback } = await supabase
      .from('roadmap_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo);

    if (recentFeedback && recentFeedback >= 5) {
      return NextResponse.json(
        { error: 'Too many feedback submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Insert feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('roadmap_feedback')
      .insert({
        post_id: postId,
        content: content.trim(),
        author_name: isAnonymous ? null : authorName,
        author_email: isAnonymous ? null : authorEmail,
        is_anonymous: isAnonymous,
        ip_address: ip,
        user_agent: userAgent
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Feedback creation error:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        content: feedback.content,
        created_at: feedback.created_at,
        is_anonymous: feedback.is_anonymous
      }
    });

  } catch (error) {
    console.error('Roadmap feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Check if post exists and belongs to a public project
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        projects!inner(id, is_private)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.projects.is_private) {
      return NextResponse.json(
        { error: 'Cannot view feedback for private project posts' },
        { status: 403 }
      );
    }

    // Get feedback for the post
    const { data: feedback, error: feedbackError } = await supabase
      .from('roadmap_feedback')
      .select(`
        id,
        content,
        author_name,
        is_anonymous,
        created_at
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Feedback fetch error:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error('Roadmap feedback fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
