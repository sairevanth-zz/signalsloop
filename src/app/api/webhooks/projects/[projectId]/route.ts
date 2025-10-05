import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { withRateLimit } from '@/middleware/rate-limit';
import crypto from 'crypto';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withRateLimit(request, async () => getHandler(request, params), 'webhookManagement');
}

async function getHandler(
  request: NextRequest,
  params: Promise<{ projectId: string }>
) {
  try {
    const { projectId } = await params;

    // Get API key from header - FIXED: Using capital 'A' Authorization
    const authHeader = request.headers.get('Authorization');
    console.log('[WEBHOOK] Auth header received:', authHeader ? 'YES' : 'NO');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[WEBHOOK] Missing or invalid Authorization header');
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Verify API key - use the same approach as v1 routes
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    console.log('[WEBHOOK GET] API Key prefix:', apiKey.substring(0, 10));
    console.log('[WEBHOOK GET] Key Hash:', keyHash);

    const supabase = getSupabaseClient();
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select(`
        *,
        projects!inner(id, slug, name, plan, user_id)
      `)
      .eq('key_hash', keyHash)
      .single();

    console.log('[WEBHOOK GET] Query error:', keyError);
    console.log('[WEBHOOK GET] Query result:', apiKeyData ? 'Found' : 'Not found');
    if (apiKeyData) {
      console.log('[WEBHOOK GET] Project ID from DB:', apiKeyData.projects.id);
      console.log('[WEBHOOK GET] Requested Project ID:', projectId);
    }

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Verify the API key belongs to the requested project
    if (apiKeyData.projects.id !== projectId) {
      return NextResponse.json({ error: 'Invalid API key for this project' }, { status: 401 });
    }

    // Fetch webhooks
    const { data: webhooks, error } = await supabase
      .from('feedback_webhooks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    return NextResponse.json({ data: webhooks });
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withRateLimit(request, async () => postHandler(request, params), 'webhookManagement');
}

async function postHandler(
  request: NextRequest,
  params: Promise<{ projectId: string }>
) {
  try {
    const { projectId } = await params;

    // Get API key from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Verify API key - use the same approach as v1 routes
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const supabase = getSupabaseClient();
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select(`
        *,
        projects!inner(id, slug, name, plan, user_id)
      `)
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Verify the API key belongs to the requested project
    if (apiKeyData.projects.id !== projectId) {
      return NextResponse.json({ error: 'Invalid API key for this project' }, { status: 401 });
    }

    const body = await request.json();
    const {
      webhook_url,
      events = ['post.created', 'post.status_changed', 'post.deleted', 'comment.created', 'vote.created'],
      description,
      webhook_secret,
    } = body;

    // Validate webhook URL
    if (!webhook_url || !webhook_url.startsWith('http')) {
      return NextResponse.json({ error: 'Valid webhook URL is required' }, { status: 400 });
    }

    // Validate events
    const validEvents = ['post.created', 'post.status_changed', 'post.deleted', 'comment.created', 'vote.created'];
    if (!Array.isArray(events) || events.some((e) => !validEvents.includes(e))) {
      return NextResponse.json({ error: 'Invalid events' }, { status: 400 });
    }

    // Generate webhook secret if not provided
    const finalSecret = webhook_secret || crypto.randomBytes(32).toString('hex');

    const { data: webhook, error } = await supabase
      .from('feedback_webhooks')
      .insert({
        project_id: projectId,
        webhook_url,
        webhook_secret: finalSecret,
        events,
        description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    return NextResponse.json({ data: webhook }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
