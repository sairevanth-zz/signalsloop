import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { withRateLimit } from '@/middleware/rate-limit';
import crypto from 'crypto';

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
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get API key from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Verify API key belongs to this project
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('project_id')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyData || apiKeyData.project_id !== projectId) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
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
    const supabase = getSupabaseServiceRoleClient();

    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get API key from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Verify API key belongs to this project
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('project_id')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyData || apiKeyData.project_id !== projectId) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
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
