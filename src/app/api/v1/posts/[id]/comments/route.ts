import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET /api/v1/posts/[id]/comments - Get all comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { project } = authResult;
    const resolvedParams = await params;
    const postId = resolvedParams.id;

    const supabase = getSupabaseClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // First verify the post belongs to this project
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        boards!inner(project_id)
      `)
      .eq('id', postId)
      .eq('boards.project_id', project.id)
      .single();

    if (postError) {
      if (postError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      console.error('Error fetching post:', postError);
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }

    // Get comments for this post
    const { data: comments, error, count } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        author_name,
        author_email,
        created_at,
        updated_at
      `)
      .eq('post_id', postId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({
      data: comments,
      pagination: {
        limit,
        offset,
        total: count,
        has_more: comments.length === limit
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/posts/[id]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { project } = authResult;
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const body = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json({ 
        error: 'Missing required field: content is required' 
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // First verify the post belongs to this project
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        boards!inner(project_id)
      `)
      .eq('id', postId)
      .eq('boards.project_id', project.id)
      .single();

    if (postError) {
      if (postError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      console.error('Error fetching post:', postError);
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content: body.content,
        author_name: body.author_name || 'API User',
        author_email: body.author_email || null,
        created_via: 'api'
      })
      .select(`
        id,
        content,
        author_name,
        author_email,
        created_at,
        updated_at
      `)
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Update the post's comment count
    await supabase
      .from('posts')
      .update({ comments_count: supabase.sql`comments_count + 1` })
      .eq('id', postId);

    return NextResponse.json({ data: comment }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
