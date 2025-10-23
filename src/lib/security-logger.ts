import { NextRequest } from 'next/server';

/**
 * Security Event Logger
 * Logs security-related events for monitoring and auditing
 */

export type SecurityEventType =
  | 'rate_limit_exceeded'
  | 'invalid_api_key'
  | 'csrf_validation_failed'
  | 'xss_attempt_blocked'
  | 'sql_injection_attempt'
  | 'unauthorized_access'
  | 'suspicious_request'
  | 'authentication_failed'
  | 'validation_error'
  | 'malicious_file_upload';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Log security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 Security Event:', {
      type: fullEvent.type,
      severity: fullEvent.severity,
      message: fullEvent.message,
      ip: fullEvent.ip,
      path: fullEvent.path,
      metadata: fullEvent.metadata,
    });
  }

  // In production, send to logging service
  // You can integrate with services like:
  // - Sentry
  // - LogRocket
  // - Datadog
  // - Custom logging endpoint
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry
    // Sentry.captureMessage(fullEvent.message, {
    //   level: fullEvent.severity === 'critical' ? 'error' : 'warning',
    //   extra: fullEvent,
    // });

    // Example: Send to custom logging endpoint
    if (process.env.SECURITY_LOG_ENDPOINT) {
      fetch(process.env.SECURITY_LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent),
      }).catch(console.error);
    }
  }

  // Store critical events in database for audit trail
  if (fullEvent.severity === 'critical' || fullEvent.severity === 'high') {
    storeSecurityEventInDatabase(fullEvent).catch(console.error);
  }
}

/**
 * Store security event in database
 */
async function storeSecurityEventInDatabase(event: SecurityEvent): Promise<void> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getSupabaseServiceRoleClient } = await import('./supabase-client');
    const supabase = getSupabaseServiceRoleClient();

    await supabase.from('security_events').insert({
      type: event.type,
      severity: event.severity,
      message: event.message,
      ip: event.ip,
      user_agent: event.userAgent,
      path: event.path,
      method: event.method,
      user_id: event.userId,
      project_id: event.projectId,
      metadata: event.metadata,
      created_at: event.timestamp.toISOString(),
    });
  } catch (error) {
    console.error('Failed to store security event:', error);
  }
}

/**
 * Extract request metadata for logging
 */
export function extractRequestMetadata(request: NextRequest): {
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = request.nextUrl.pathname;
  const method = request.method;

  return { ip, userAgent, path, method };
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(
  request: NextRequest,
  identifier: string,
  limit: number
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'rate_limit_exceeded',
    severity: 'medium',
    message: `Rate limit of ${limit} requests exceeded`,
    ...metadata,
    metadata: { identifier },
  });
}

/**
 * Log invalid API key
 */
export function logInvalidApiKey(request: NextRequest, apiKey: string): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'invalid_api_key',
    severity: 'high',
    message: 'Invalid API key used',
    ...metadata,
    metadata: { apiKeyPrefix: apiKey.substring(0, 8) + '...' },
  });
}

/**
 * Log CSRF validation failure
 */
export function logCSRFValidationFailed(request: NextRequest): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'csrf_validation_failed',
    severity: 'high',
    message: 'CSRF token validation failed',
    ...metadata,
  });
}

/**
 * Log XSS attempt
 */
export function logXSSAttempt(
  request: NextRequest,
  field: string,
  value: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'xss_attempt_blocked',
    severity: 'high',
    message: `Potential XSS attack detected in field: ${field}`,
    ...metadata,
    metadata: { field, valuePreview: value.substring(0, 100) },
  });
}

/**
 * Log SQL injection attempt
 */
export function logSQLInjectionAttempt(
  request: NextRequest,
  field: string,
  value: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'sql_injection_attempt',
    severity: 'critical',
    message: `Potential SQL injection detected in field: ${field}`,
    ...metadata,
    metadata: { field, valuePreview: value.substring(0, 100) },
  });
}

/**
 * Log unauthorized access
 */
export function logUnauthorizedAccess(
  request: NextRequest,
  userId?: string,
  resourceId?: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'unauthorized_access',
    severity: 'high',
    message: 'Unauthorized access attempt',
    userId,
    ...metadata,
    metadata: { resourceId },
  });
}

/**
 * Log suspicious request
 */
export function logSuspiciousRequest(
  request: NextRequest,
  reason: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'suspicious_request',
    severity: 'medium',
    message: `Suspicious request detected: ${reason}`,
    ...metadata,
    metadata: { reason },
  });
}

/**
 * Log authentication failure
 */
export function logAuthenticationFailed(
  request: NextRequest,
  reason: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'authentication_failed',
    severity: 'medium',
    message: `Authentication failed: ${reason}`,
    ...metadata,
    metadata: { reason },
  });
}

/**
 * Log validation error
 */
export function logValidationError(
  request: NextRequest,
  field: string,
  error: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'validation_error',
    severity: 'low',
    message: `Validation error in field: ${field}`,
    ...metadata,
    metadata: { field, error },
  });
}

/**
 * Log malicious file upload
 */
export function logMaliciousFileUpload(
  request: NextRequest,
  fileName: string,
  reason: string
): void {
  const metadata = extractRequestMetadata(request);

  logSecurityEvent({
    type: 'malicious_file_upload',
    severity: 'critical',
    message: `Malicious file upload attempt: ${fileName}`,
    ...metadata,
    metadata: { fileName, reason },
  });
}
