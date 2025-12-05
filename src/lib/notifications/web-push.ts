/**
 * Web Push Notification Service
 * Handles push subscription management and notification sending
 */

import webpush from 'web-push';
import { getSupabaseServerClient } from '@/lib/supabase-client';
import type {
  PushSubscriptionData,
  StoredPushSubscription,
  NotificationPayload,
  NotificationPreferences,
  NotificationType,
  SendNotificationResult,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './types';

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@signalsloop.com';

let isInitialized = false;

function initializeWebPush() {
  if (isInitialized) return;
  
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID keys not configured. Push notifications disabled.');
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  isInitialized = true;
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

/**
 * Save a push subscription to the database
 */
export async function saveSubscription(
  userId: string,
  projectId: string,
  subscription: PushSubscriptionData,
  userAgent?: string
): Promise<StoredPushSubscription | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error('[WebPush] Database connection not available');
    return null;
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        project_id: projectId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: userAgent,
        preferences: {
          critical: true,
          anomalies: true,
          competitive: true,
          weekly: false,
          mentions: true,
          specs: false,
          roadmap: false,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,endpoint',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[WebPush] Error saving subscription:', error);
    return null;
  }

  return mapToStoredSubscription(data);
}

/**
 * Remove a push subscription
 */
export async function removeSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[WebPush] Error removing subscription:', error);
    return false;
  }

  return true;
}

/**
 * Get all subscriptions for a project
 */
export async function getProjectSubscriptions(
  projectId: string,
  notificationType?: NotificationType
): Promise<StoredPushSubscription[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('project_id', projectId);

  if (error || !data) {
    console.error('[WebPush] Error fetching subscriptions:', error);
    return [];
  }

  let subscriptions = data.map(mapToStoredSubscription);

  // Filter by notification type preferences
  if (notificationType) {
    subscriptions = subscriptions.filter((sub) => {
      return shouldSendNotification(sub.preferences, notificationType);
    });
  }

  return subscriptions;
}

/**
 * Get subscriptions for specific users
 */
export async function getUserSubscriptions(
  userIds: string[],
  projectId: string
): Promise<StoredPushSubscription[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('project_id', projectId)
    .in('user_id', userIds);

  if (error || !data) {
    return [];
  }

  return data.map(mapToStoredSubscription);
}

/**
 * Update notification preferences for a subscription
 */
export async function updatePreferences(
  userId: string,
  endpoint: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  // Get current preferences
  const { data: current } = await supabase
    .from('push_subscriptions')
    .select('preferences')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .single();

  const newPreferences = {
    ...(current?.preferences || {}),
    ...preferences,
  };

  const { error } = await supabase
    .from('push_subscriptions')
    .update({
      preferences: newPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[WebPush] Error updating preferences:', error);
    return false;
  }

  return true;
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: StoredPushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  initializeWebPush();

  if (!isInitialized) {
    console.warn('[WebPush] Not initialized, skipping notification');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    
    // Update last used timestamp
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', subscription.id);
    }

    return true;
  } catch (error: any) {
    console.error('[WebPush] Error sending notification:', error);

    // Handle expired subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      await removeSubscription(subscription.userId, subscription.endpoint);
    }

    return false;
  }
}

/**
 * Send notifications to all subscriptions in a project
 */
export async function sendBatchNotifications(
  projectId: string,
  payload: NotificationPayload,
  notificationType: NotificationType = 'general',
  targetUserIds?: string[]
): Promise<SendNotificationResult> {
  let subscriptions: StoredPushSubscription[];

  if (targetUserIds && targetUserIds.length > 0) {
    subscriptions = await getUserSubscriptions(targetUserIds, projectId);
  } else {
    subscriptions = await getProjectSubscriptions(projectId, notificationType);
  }

  if (subscriptions.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      sent++;
    } else {
      failed++;
      if (result.status === 'rejected') {
        errors.push(`Subscription ${subscriptions[index].id}: ${result.reason}`);
      }
    }
  });

  return {
    success: failed === 0,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Check if a notification should be sent based on preferences
 */
function shouldSendNotification(
  preferences: NotificationPreferences,
  type: NotificationType
): boolean {
  switch (type) {
    case 'critical_feedback':
      return preferences.critical;
    case 'anomaly_detected':
      return preferences.anomalies;
    case 'competitor_alert':
      return preferences.competitive;
    case 'weekly_digest':
      return preferences.weekly;
    case 'mention':
      return preferences.mentions;
    case 'spec_generated':
      return preferences.specs;
    case 'roadmap_update':
      return preferences.roadmap;
    case 'general':
    default:
      return true;
  }
}

/**
 * Map database record to StoredPushSubscription
 */
function mapToStoredSubscription(record: any): StoredPushSubscription {
  return {
    id: record.id,
    userId: record.user_id,
    projectId: record.project_id,
    endpoint: record.endpoint,
    keys: record.keys,
    preferences: record.preferences || {
      critical: true,
      anomalies: true,
      competitive: true,
      weekly: false,
      mentions: true,
      specs: false,
      roadmap: false,
    },
    userAgent: record.user_agent,
    createdAt: new Date(record.created_at),
    lastUsedAt: record.last_used_at ? new Date(record.last_used_at) : undefined,
  };
}

/**
 * Create notification payloads for common events
 */
export const notificationTemplates = {
  criticalFeedback: (feedbackTitle: string, projectSlug: string, feedbackId: string): NotificationPayload => ({
    title: '🚨 Critical Feedback Alert',
    body: `Negative sentiment detected: ${feedbackTitle.substring(0, 100)}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'critical-feedback',
    url: `/${projectSlug}/board?highlight=${feedbackId}`,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Feedback' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }),

  anomalyDetected: (description: string, projectSlug: string): NotificationPayload => ({
    title: '📊 Anomaly Detected',
    body: description.substring(0, 150),
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'anomaly',
    url: `/${projectSlug}/dashboard`,
    actions: [
      { action: 'view', title: 'View Details' },
    ],
  }),

  competitorAlert: (competitorName: string, eventType: string, projectSlug: string): NotificationPayload => ({
    title: '🎯 Competitor Update',
    body: `${competitorName}: ${eventType}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'competitor',
    url: `/${projectSlug}/competitive`,
    actions: [
      { action: 'view', title: 'View Intel' },
    ],
  }),

  specGenerated: (specTitle: string, projectSlug: string, specId: string): NotificationPayload => ({
    title: '📝 New Spec Generated',
    body: `AI generated a spec: ${specTitle.substring(0, 100)}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'spec',
    url: `/${projectSlug}/specs/${specId}`,
    actions: [
      { action: 'review', title: 'Review Spec' },
    ],
  }),

  weeklyDigest: (summary: string, projectSlug: string): NotificationPayload => ({
    title: '📈 Weekly Digest Ready',
    body: summary.substring(0, 150),
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'weekly-digest',
    url: `/${projectSlug}/dashboard`,
    silent: true,
  }),
};
