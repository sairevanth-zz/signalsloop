import crypto from 'crypto';
import { getSupabaseServiceRoleClient } from './supabase-client';

export type WebhookEvent =
  // Core feedback events
  | 'post.created'
  | 'post.status_changed'
  | 'post.deleted'
  | 'comment.created'
  | 'vote.created'
  // Mission Control events
  | 'briefing.generated'
  | 'health.threshold_crossed'
  // AI/Analytics events
  | 'anomaly.detected'
  | 'theme.emerging'
  | 'sentiment.shift'
  | 'priority.escalated'
  | 'duplicate.merged'
  | 'spec.generated';

export interface WebhookPayload {
  event: WebhookEvent;
  data: unknown;
  timestamp: string;
  project_id: string;
}

export interface FeedbackWebhook {
  id: string;
  project_id: string;
  webhook_url: string;
  webhook_secret: string;
  events: WebhookEvent[];
  is_active: boolean;
  description?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status_code?: number;
  error?: string;
  duration_ms: number;
}

/**
 * Generate HMAC SHA-256 signature for webhook payload
 */
export function generateWebhookSignature(
  payload: WebhookPayload,
  secret: string
): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Deliver webhook to a single endpoint
 */
export async function deliverWebhook(
  webhook: FeedbackWebhook,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const supabase = getSupabaseServiceRoleClient();

  try {
    const signature = generateWebhookSignature(payload, webhook.webhook_secret);

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'User-Agent': 'SignalsLoop-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const duration = Date.now() - startTime;
    const success = response.ok;
    const statusCode = response.status;

    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch {
      // Ignore response body errors
    }

    // Log delivery attempt
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      status_code: statusCode,
      response_body: responseBody.substring(0, 1000), // Limit to 1000 chars
      success,
      delivery_duration_ms: duration,
    });

    // Update webhook stats
    if (success) {
      await supabase
        .from('feedback_webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: statusCode,
          failure_count: 0,
        })
        .eq('id', webhook.id);
    } else {
      await supabase
        .from('feedback_webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: statusCode,
          failure_count: webhook.id, // Increment handled by DB
        })
        .eq('id', webhook.id);
    }

    return {
      success,
      status_code: statusCode,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed delivery
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      error_message: errorMessage,
      success: false,
      delivery_duration_ms: duration,
    });

    // Update failure count
    await supabase
      .from('feedback_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: webhook.id, // Increment handled by DB
      })
      .eq('id', webhook.id);

    return {
      success: false,
      error: errorMessage,
      duration_ms: duration,
    };
  }
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  projectId: string,
  event: WebhookEvent,
  data: unknown
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();

  try {
    // Fetch active webhooks for this project that are subscribed to this event
    const { data: webhooks, error } = await supabase
      .from('feedback_webhooks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (error) {
      console.error('Error fetching webhooks:', error);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for event ${event} in project ${projectId}`);
      return;
    }

    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      project_id: projectId,
    };

    // Deliver webhooks in parallel (fire and forget)
    const deliveryPromises = webhooks.map((webhook) =>
      deliverWebhook(webhook as FeedbackWebhook, payload).catch((error) => {
        console.error(`Webhook delivery failed for ${webhook.id}:`, error);
      })
    );

    // Don't await - fire and forget to avoid blocking the main request
    Promise.all(deliveryPromises).catch((error) => {
      console.error('Error in webhook delivery batch:', error);
    });

    console.log(`Triggered ${webhooks.length} webhook(s) for event ${event}`);
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Test webhook delivery with sample payload
 */
export async function testWebhookDelivery(
  webhookId: string
): Promise<WebhookDeliveryResult> {
  const supabase = getSupabaseServiceRoleClient();

  const { data: webhook, error } = await supabase
    .from('feedback_webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();

  if (error || !webhook) {
    return {
      success: false,
      error: 'Webhook not found',
      duration_ms: 0,
    };
  }

  const testPayload: WebhookPayload = {
    event: 'post.created',
    data: {
      post: {
        id: 'test-post-id',
        title: 'Test Post',
        description: 'This is a test webhook delivery',
        status: 'open',
        created_at: new Date().toISOString(),
      },
      project: {
        id: webhook.project_id,
        name: 'Test Project',
      },
    },
    timestamp: new Date().toISOString(),
    project_id: webhook.project_id,
  };

  return deliverWebhook(webhook as FeedbackWebhook, testPayload);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Remove 'sha256=' prefix if present
    const providedSignature = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  } catch {
    return false;
  }
}
