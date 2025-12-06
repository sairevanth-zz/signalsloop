/**
 * Webhook Security Utilities
 * Centralized signature verification for all webhook integrations
 * 
 * SOC 2 Requirement: All incoming webhooks must verify signatures
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Generic HMAC Verification
// ============================================================================

/**
 * Verify HMAC-SHA256 signature (most common webhook format)
 */
export function verifyHmacSha256(
  payload: string | Buffer,
  signature: string,
  secret: string,
  prefix: string = 'sha256='
): WebhookVerificationResult {
  if (!signature || !secret) {
    return { valid: false, error: 'Missing signature or secret' };
  }

  try {
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBuffer)
      .digest('hex');

    // Remove prefix if present
    const actualSignature = signature.startsWith(prefix) 
      ? signature.slice(prefix.length) 
      : signature;

    // Timing-safe comparison
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(actualSignature, 'hex');

    if (expected.length !== actual.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    const valid = crypto.timingSafeEqual(expected, actual);
    return { valid, error: valid ? undefined : 'Signature mismatch' };
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error}` };
  }
}

// ============================================================================
// Stripe Webhook Verification
// ============================================================================

/**
 * Verify Stripe webhook signature
 * Uses Stripe's timestamp-based signature format
 */
export function verifyStripeSignature(
  payload: string | Buffer,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): WebhookVerificationResult {
  if (!signatureHeader || !secret) {
    return { valid: false, error: 'Missing signature header or secret' };
  }

  try {
    // Parse signature header: t=timestamp,v1=signature
    const elements = signatureHeader.split(',');
    const signatures: { t?: string; v1?: string } = {};
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') signatures.t = value;
      if (key === 'v1') signatures.v1 = value;
    }

    if (!signatures.t || !signatures.v1) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Check timestamp tolerance
    const timestamp = parseInt(signatures.t, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return { valid: false, error: 'Timestamp outside tolerance' };
    }

    // Verify signature
    const payloadString = typeof payload === 'string' ? payload : payload.toString();
    const signedPayload = `${signatures.t}.${payloadString}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatures.v1)
    );

    return { valid, error: valid ? undefined : 'Signature mismatch' };
  } catch (error) {
    return { valid: false, error: `Stripe verification failed: ${error}` };
  }
}

// ============================================================================
// Slack Webhook Verification
// ============================================================================

/**
 * Verify Slack request signature
 * Uses Slack's v0 signature format
 */
export function verifySlackSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string,
  toleranceSeconds: number = 300
): WebhookVerificationResult {
  if (!signature || !timestamp || !secret) {
    return { valid: false, error: 'Missing signature, timestamp, or secret' };
  }

  try {
    // Check timestamp tolerance (prevent replay attacks)
    const requestTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > toleranceSeconds) {
      return { valid: false, error: 'Request too old' };
    }

    // Create signature base string
    const sigBaseString = `v0:${timestamp}:${payload}`;
    const expectedSignature = 'v0=' + crypto
      .createHmac('sha256', secret)
      .update(sigBaseString)
      .digest('hex');

    // Timing-safe comparison
    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    return { valid, error: valid ? undefined : 'Signature mismatch' };
  } catch (error) {
    return { valid: false, error: `Slack verification failed: ${error}` };
  }
}

// ============================================================================
// LaunchDarkly Webhook Verification
// ============================================================================

/**
 * Verify LaunchDarkly webhook signature
 * LaunchDarkly uses HMAC-SHA256 with X-LD-Signature header
 */
export function verifyLaunchDarklySignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signature || !secret) {
    return { valid: false, error: 'Missing signature or secret' };
  }

  // LaunchDarkly signature is plain HMAC-SHA256 hex
  return verifyHmacSha256(payload, signature, secret, '');
}

// ============================================================================
// Optimizely Webhook Verification
// ============================================================================

/**
 * Verify Optimizely webhook signature
 * Optimizely uses HMAC-SHA256 with X-Optimizely-Signature header
 */
export function verifyOptimizelySignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signature || !secret) {
    return { valid: false, error: 'Missing signature or secret' };
  }

  // Optimizely signature is plain HMAC-SHA256 hex
  return verifyHmacSha256(payload, signature, secret, '');
}

// ============================================================================
// GitHub Webhook Verification
// ============================================================================

/**
 * Verify GitHub webhook signature
 * GitHub uses X-Hub-Signature-256 header with sha256= prefix
 */
export function verifyGitHubSignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signature || !secret) {
    return { valid: false, error: 'Missing signature or secret' };
  }

  return verifyHmacSha256(payload, signature, secret, 'sha256=');
}

// ============================================================================
// Outbound Webhook Signing
// ============================================================================

/**
 * Generate signature for outbound webhooks
 * Used when SignalsLoop sends webhooks to customer endpoints
 */
export function signOutboundWebhook(
  payload: string | object,
  secret: string
): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    signature: `t=${timestamp},v1=${signature}`,
    timestamp,
  };
}

/**
 * Generate headers for outbound webhook request
 */
export function getOutboundWebhookHeaders(
  payload: string | object,
  secret: string
): Record<string, string> {
  const { signature, timestamp } = signOutboundWebhook(payload, secret);
  
  return {
    'Content-Type': 'application/json',
    'X-SignalsLoop-Signature': signature,
    'X-SignalsLoop-Timestamp': timestamp.toString(),
  };
}
