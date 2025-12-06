/**
 * Audit Logger Service
 * Provides comprehensive audit logging for SOC 2 compliance
 * 
 * Usage:
 *   await logAuditEvent({
 *     eventType: 'user.login',
 *     eventCategory: 'auth',
 *     actorId: user.id,
 *     actorEmail: user.email,
 *     action: 'login',
 *     actionStatus: 'success',
 *   });
 */

import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export type AuditEventCategory = 
  | 'auth'        // Authentication events
  | 'data'        // Data operations
  | 'admin'       // Administrative actions
  | 'security'    // Security events
  | 'api'         // API access
  | 'integration' // Integration events
  | 'general';    // General events

export type AuditActionStatus = 'success' | 'failure' | 'denied';

export type AuditActorType = 'user' | 'system' | 'api' | 'cron';

export interface AuditEventInput {
  // Event identification
  eventType: string;
  eventCategory?: AuditEventCategory;
  
  // Actor information
  actorId?: string;
  actorEmail?: string;
  actorType?: AuditActorType;
  
  // Resource information
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  
  // Action details
  action: string;
  actionStatus?: AuditActionStatus;
  
  // Change tracking
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changes?: Record<string, any>;
  
  // Request context
  request?: NextRequest;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  
  // Additional context
  projectId?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Common Event Types
// ============================================================================

export const AuditEventTypes = {
  // Authentication
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGE: 'user.password_change',
  USER_MFA_ENABLED: 'user.mfa_enabled',
  USER_MFA_DISABLED: 'user.mfa_disabled',
  USER_PASSWORD_RESET_REQUEST: 'user.password_reset_request',
  USER_EMAIL_VERIFIED: 'user.email_verified',
  
  // User management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  
  // Data operations
  DATA_CREATE: 'data.create',
  DATA_READ: 'data.read',
  DATA_UPDATE: 'data.update',
  DATA_DELETE: 'data.delete',
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  
  // Project management
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_MEMBER_ADDED: 'project.member_added',
  PROJECT_MEMBER_REMOVED: 'project.member_removed',
  PROJECT_ROLE_CHANGED: 'project.role_changed',
  
  // API keys
  API_KEY_CREATE: 'api_key.create',
  API_KEY_REVOKE: 'api_key.revoke',
  API_KEY_USED: 'api_key.used',
  
  // Webhooks
  WEBHOOK_CREATE: 'webhook.create',
  WEBHOOK_UPDATE: 'webhook.update',
  WEBHOOK_DELETE: 'webhook.delete',
  WEBHOOK_TRIGGERED: 'webhook.triggered',
  
  // Settings
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_RESET: 'settings.reset',
  
  // Integrations
  INTEGRATION_CONNECT: 'integration.connect',
  INTEGRATION_DISCONNECT: 'integration.disconnect',
  INTEGRATION_SYNC: 'integration.sync',
  INTEGRATION_ERROR: 'integration.error',
  
  // Security events
  SECURITY_ACCESS_DENIED: 'security.access_denied',
  SECURITY_RATE_LIMITED: 'security.rate_limited',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_CSRF_FAILURE: 'security.csrf_failure',
  
  // Admin actions
  ADMIN_USER_CREATE: 'admin.user_create',
  ADMIN_USER_DELETE: 'admin.user_delete',
  ADMIN_ROLE_CHANGE: 'admin.role_change',
  ADMIN_SYSTEM_CONFIG: 'admin.system_config',
} as const;

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Log an audit event
 */
export async function logAuditEvent(event: AuditEventInput): Promise<string | null> {
  try {
    // Extract request context if provided
    let ipAddress = event.ipAddress;
    let userAgent = event.userAgent;
    let requestPath = event.requestPath;
    let requestMethod = event.requestMethod;
    
    if (event.request) {
      const forwarded = event.request.headers.get('x-forwarded-for');
      ipAddress = ipAddress || (forwarded ? forwarded.split(',')[0].trim() : undefined);
      userAgent = userAgent || event.request.headers.get('user-agent') || undefined;
      requestPath = requestPath || event.request.nextUrl.pathname;
      requestMethod = requestMethod || event.request.method;
    }
    
    // Prepare audit log entry
    const logEntry = {
      event_type: event.eventType,
      event_category: event.eventCategory || inferEventCategory(event.eventType),
      actor_id: event.actorId || null,
      actor_email: event.actorEmail || null,
      actor_type: event.actorType || 'user',
      resource_type: event.resourceType || null,
      resource_id: event.resourceId || null,
      resource_name: event.resourceName || null,
      action: event.action,
      action_status: event.actionStatus || 'success',
      previous_value: event.previousValue || null,
      new_value: event.newValue || null,
      changes: event.changes || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      request_path: requestPath || null,
      request_method: requestMethod || null,
      project_id: event.projectId || null,
      session_id: event.sessionId || null,
      correlation_id: event.correlationId || null,
      metadata: event.metadata || {},
    };
    
    // Import Supabase client dynamically to avoid circular deps
    const { getSupabaseServiceRoleClient } = await import('./supabase-client');
    const supabase = getSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(logEntry)
      .select('id')
      .single();
    
    if (error) {
      console.error('[AuditLogger] Failed to log event:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error('[AuditLogger] Error logging audit event:', error);
    return null;
  }
}

/**
 * Log multiple audit events in batch
 */
export async function logAuditEventsBatch(events: AuditEventInput[]): Promise<number> {
  let successCount = 0;
  
  // Process in parallel with a limit
  const batchSize = 10;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(e => logAuditEvent(e)));
    successCount += results.filter(r => r !== null).length;
  }
  
  return successCount;
}

/**
 * Helper to create change tracking object
 */
export function trackChanges(
  previous: Record<string, any>,
  current: Record<string, any>,
  fieldsToTrack?: string[]
): Record<string, { from: any; to: any }> | null {
  const changes: Record<string, { from: any; to: any }> = {};
  const fields = fieldsToTrack || Object.keys({ ...previous, ...current });
  
  for (const field of fields) {
    const prevValue = previous[field];
    const currValue = current[field];
    
    // Skip if values are equal
    if (JSON.stringify(prevValue) === JSON.stringify(currValue)) {
      continue;
    }
    
    changes[field] = {
      from: prevValue,
      to: currValue,
    };
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Infer event category from event type
 */
function inferEventCategory(eventType: string): AuditEventCategory {
  if (eventType.startsWith('user.login') || 
      eventType.startsWith('user.logout') ||
      eventType.startsWith('user.password') ||
      eventType.startsWith('user.mfa')) {
    return 'auth';
  }
  
  if (eventType.startsWith('data.')) {
    return 'data';
  }
  
  if (eventType.startsWith('admin.')) {
    return 'admin';
  }
  
  if (eventType.startsWith('security.')) {
    return 'security';
  }
  
  if (eventType.startsWith('api_key.') || eventType.startsWith('api.')) {
    return 'api';
  }
  
  if (eventType.startsWith('integration.')) {
    return 'integration';
  }
  
  return 'general';
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Log a user login event
 */
export async function logUserLogin(
  userId: string,
  email: string,
  request?: NextRequest,
  success = true
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventTypes.USER_LOGIN,
    eventCategory: 'auth',
    actorId: userId,
    actorEmail: email,
    action: 'login',
    actionStatus: success ? 'success' : 'failure',
    request,
  });
}

/**
 * Log a user logout event
 */
export async function logUserLogout(
  userId: string,
  email: string,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventTypes.USER_LOGOUT,
    eventCategory: 'auth',
    actorId: userId,
    actorEmail: email,
    action: 'logout',
    actionStatus: 'success',
    request,
  });
}

/**
 * Log a data export event
 */
export async function logDataExport(
  userId: string,
  email: string,
  resourceType: string,
  projectId: string,
  exportFormat: string,
  recordCount: number,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventTypes.DATA_EXPORT,
    eventCategory: 'data',
    actorId: userId,
    actorEmail: email,
    resourceType,
    action: 'export',
    actionStatus: 'success',
    projectId,
    metadata: {
      format: exportFormat,
      recordCount,
    },
    request,
  });
}

/**
 * Log an API key usage event
 */
export async function logAPIKeyUsage(
  apiKeyId: string,
  projectId: string,
  endpoint: string,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventTypes.API_KEY_USED,
    eventCategory: 'api',
    actorType: 'api',
    resourceType: 'api_key',
    resourceId: apiKeyId,
    action: 'api_call',
    actionStatus: 'success',
    projectId,
    metadata: {
      endpoint,
    },
    request,
  });
}

/**
 * Log a security access denied event
 */
export async function logAccessDenied(
  userId: string | undefined,
  email: string | undefined,
  resourceType: string,
  resourceId: string,
  reason: string,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventTypes.SECURITY_ACCESS_DENIED,
    eventCategory: 'security',
    actorId: userId,
    actorEmail: email,
    resourceType,
    resourceId,
    action: 'access',
    actionStatus: 'denied',
    metadata: {
      reason,
    },
    request,
  });
}

/**
 * Log a settings change event
 */
export async function logSettingsChange(
  userId: string,
  email: string,
  settingType: string,
  previousValue: Record<string, any>,
  newValue: Record<string, any>,
  projectId?: string,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventTypes.SETTINGS_UPDATE,
    eventCategory: 'admin',
    actorId: userId,
    actorEmail: email,
    resourceType: 'settings',
    resourceName: settingType,
    action: 'update',
    actionStatus: 'success',
    previousValue,
    newValue,
    changes: trackChanges(previousValue, newValue),
    projectId,
    request,
  });
}
