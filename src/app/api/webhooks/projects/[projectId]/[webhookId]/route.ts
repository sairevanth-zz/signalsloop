import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import crypto from 'crypto';

export async function PATCH(
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

    const apiKey = authHeader.replace('Bearer ', '');

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
    const { webhook_url, events, description, is_active } = body;

    const updateData: Record<string, unknown> = {};
    if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
    if (events !== undefined) updateData.events = events;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: webhook, error } = await supabase
      .from('feedback_webhooks')
      .update(updateData)
      .eq('id', webhookId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating webhook:', error);
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
    }

    return NextResponse.json({ data: webhook });
  } catch (error) {
    console.error('Error in PATCH /api/projects/[projectId]/webhooks/[webhookId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const apiKey = authHeader.replace('Bearer ', '');

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

    const { error } = await supabase
      .from('feedback_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting webhook:', error);
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[projectId]/webhooks/[webhookId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
