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

// GET /api/v1/posts/[id] - Get a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(request, async () => getHandler(request, params), 'api');
}

async function getHandler(
  request: NextRequest,
  params: Promise<{ id: string }>
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

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        status,
        ai_category,
        ai_confidence,
        vote_count,
        comments_count,
        author_name,
        author_email,
        created_at,
        updated_at,
        boards!inner(
          id,
          name,
          project_id
        )
      `)
      .eq('id', postId)
      .eq('boards.project_id', project.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      console.error('Error fetching post:', error);
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }

    return NextResponse.json({ data: post });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/v1/posts/[id] - Update a specific post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(request, async () => putHandler(request, params), 'api');
}

async function putHandler(
  request: NextRequest,
  params: Promise<{ id: string }>
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

    const supabase = getSupabaseClient();

    // First, verify the post belongs to this project
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id,
        boards!inner(project_id)
      `)
      .eq('id', postId)
      .eq('boards.project_id', project.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      console.error('Error fetching post:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.category !== undefined) updateData.ai_category = body.category;
    if (body.confidence !== undefined) updateData.ai_confidence = body.confidence;
    if (body.author_name !== undefined) updateData.author_name = body.author_name;
    if (body.author_email !== undefined) updateData.author_email = body.author_email;

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select(`
        id,
        title,
        description,
        status,
        ai_category,
        ai_confidence,
        vote_count,
        comments_count,
        author_name,
        author_email,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedPost });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/posts/[id] - Delete a specific post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(request, async () => deleteHandler(request, params), 'api');
}

async function deleteHandler(
  request: NextRequest,
  params: Promise<{ id: string }>
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

    // First, verify the post belongs to this project
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        boards!inner(project_id)
      `)
      .eq('id', postId)
      .eq('boards.project_id', project.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      console.error('Error fetching post:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }

    // Delete the post (this will cascade delete comments and votes)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Post deleted successfully',
      deleted_post: {
        id: postId,
        title: existingPost.title
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
