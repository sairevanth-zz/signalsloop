import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseServiceRoleClient();

    const { data: webhooks, error } = await supabase
      .from('changelog_webhooks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/changelog/webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseServiceRoleClient();
    
    const body = await request.json();
    const { webhook_url, events = ['release.published'], webhook_secret } = body;

    if (!webhook_url || !webhook_url.includes('http')) {
      return NextResponse.json({ error: 'Valid webhook URL is required' }, { status: 400 });
    }

    // Generate webhook secret if not provided
    const finalSecret = webhook_secret || crypto.randomBytes(32).toString('hex');

    const { data: webhook, error } = await supabase
      .from('changelog_webhooks')
      .insert({
        project_id: projectId,
        webhook_url,
        webhook_secret: finalSecret,
        events,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/changelog/webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Webhook testing endpoint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseServiceRoleClient();
    
    const body = await request.json();
    const { webhook_id } = body;

    if (!webhook_id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    // Get webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from('changelog_webhooks')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', webhook_id)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Send test webhook
    const testPayload = {
      event: 'release.published',
      data: {
        release: {
          id: 'test-release-id',
          title: 'Test Release',
          version: '1.0.0',
          release_type: 'major',
          published_at: new Date().toISOString(),
        },
        project: {
          id: projectId,
          name: 'Test Project',
        },
      },
      timestamp: new Date().toISOString(),
    };

    const signature = crypto
      .createHmac('sha256', webhook.webhook_secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'User-Agent': 'SignalsLoop-Webhook/1.0',
      },
      body: JSON.stringify(testPayload),
    });

    // Update last triggered timestamp
    await supabase
      .from('changelog_webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook_id);

    return NextResponse.json({
      success: true,
      status: response.status,
      message: response.ok ? 'Webhook test successful' : 'Webhook test failed',
    });
  } catch (error) {
    console.error('Error in webhook test:', error);
    return NextResponse.json({ error: 'Webhook test failed' }, { status: 500 });
  }
}
