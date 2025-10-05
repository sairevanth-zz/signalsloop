import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { testWebhookDelivery } from '@/lib/webhooks';
import crypto from 'crypto';

export async function POST(
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

    // Verify webhook belongs to this project
    const { data: webhook, error: webhookError } = await supabase
      .from('feedback_webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('project_id', projectId)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Test webhook delivery
    const result = await testWebhookDelivery(webhookId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook test successful',
        status_code: result.status_code,
        duration_ms: result.duration_ms,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Webhook test failed',
        error: result.error,
        status_code: result.status_code,
        duration_ms: result.duration_ms,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/webhooks/[webhookId]/test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
