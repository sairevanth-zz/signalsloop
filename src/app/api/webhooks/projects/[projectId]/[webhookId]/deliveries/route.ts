import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  try {
    const { projectId, webhookId } = await params;
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

    // Verify webhook belongs to this project
    const { data: webhook, error: webhookError } = await supabase
      .from('feedback_webhooks')
      .select('project_id')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook || webhook.project_id !== projectId) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch delivery logs
    const { data: deliveries, error, count } = await supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('webhook_id', webhookId)
      .order('delivered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching webhook deliveries:', error);
      return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
    }

    return NextResponse.json({
      data: deliveries,
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/webhooks/[webhookId]/deliveries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
