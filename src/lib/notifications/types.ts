/**
 * Push Notification Types
 * Types for web push notifications
 */

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
  expirationTime?: number | null;
}

export interface StoredPushSubscription {
  id: string;
  userId: string;
  projectId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  preferences: NotificationPreferences;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface NotificationPreferences {
  critical: boolean;      // Critical alerts (high priority feedback, anomalies)
  anomalies: boolean;     // Anomaly detection alerts
  competitive: boolean;   // Competitor intelligence updates
  weekly: boolean;        // Weekly digest
  mentions: boolean;      // When mentioned in feedback
  specs: boolean;         // Spec updates (auto-generated, comments)
  roadmap: boolean;       // Roadmap changes
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  critical: true,
  anomalies: true,
  competitive: true,
  weekly: false,
  mentions: true,
  specs: false,
  roadmap: false,
};

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export type NotificationType = 
  | 'critical_feedback'
  | 'anomaly_detected'
  | 'competitor_alert'
  | 'weekly_digest'
  | 'mention'
  | 'spec_generated'
  | 'roadmap_update'
  | 'general';

export interface NotificationEvent {
  type: NotificationType;
  projectId: string;
  payload: NotificationPayload;
  targetUserIds?: string[];  // If empty, send to all project users
  priority: 'high' | 'normal' | 'low';
}

export interface SendNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

export interface VAPIDKeys {
  publicKey: string;
  privateKey: string;
}
