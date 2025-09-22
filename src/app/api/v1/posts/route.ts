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
  
  // Hash the API key for comparison (same method used in embed route)
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

// GET /api/v1/posts - List all posts for a project
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { project } = authResult;
    const supabase = getSupabaseClient();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // Build query
    let query = supabase
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
      .eq('boards.project_id', project.id)
      .range(offset, offset + limit - 1)
      .order(sort, { ascending: order === 'asc' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('ai_category', category);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({
      data: posts,
      pagination: {
        limit,
        offset,
        total: count,
        has_more: posts.length === limit
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { project, apiKey } = authResult;
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json({ 
        error: 'Missing required fields: title and description are required' 
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get the first board for this project (or create one if none exists)
    let { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', project.id)
      .limit(1)
      .single();

    if (boardError && boardError.code === 'PGRST116') {
      // No board exists, create one
      const { data: newBoard, error: createError } = await supabase
        .from('boards')
        .insert({
          name: 'API Feedback Board',
          project_id: project.id,
          description: 'Automatically created board for API posts'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating board:', createError);
        return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
      }
      board = newBoard;
    } else if (boardError) {
      console.error('Error fetching board:', boardError);
      return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        title: body.title,
        description: body.description,
        board_id: board.id,
        author_name: body.author_name || 'API User',
        author_email: body.author_email || null,
        status: body.status || 'open',
        ai_category: body.category || null,
        ai_confidence: body.confidence || null,
        created_via: 'api'
      })
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

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ data: post }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
