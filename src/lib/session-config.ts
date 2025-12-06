/**
 * Session Configuration
 * Centralized session security settings for SOC 2 compliance
 * 
 * IMPORTANT: These settings must be coordinated with Supabase Dashboard settings:
 * 1. Go to Supabase Dashboard > Authentication > Settings
 * 2. Under "Auth Settings":
 *    - Set "JWT Expiry" to match SESSION_DURATION_SECONDS
 *    - Enable "Require email confirmation"
 * 3. Under "Sessions":
 *    - Set "Maximum session length" to match MAX_SESSION_DURATION_SECONDS
 *    - Set "Inactivity timeout" to match IDLE_TIMEOUT_SECONDS
 */

// ============================================================================
// Session Duration Configuration
// ============================================================================

/**
 * Session duration in seconds (default: 1 hour)
 * This is how long a JWT token is valid before needing refresh
 * For SOC 2, this should be relatively short (1-4 hours)
 */
export const SESSION_DURATION_SECONDS = parseInt(
  process.env.SESSION_DURATION_SECONDS || '3600', // 1 hour default
  10
);

/**
 * Maximum session length in seconds (default: 7 days)
 * Even with token refresh, sessions expire after this time
 * User must re-authenticate
 */
export const MAX_SESSION_DURATION_SECONDS = parseInt(
  process.env.MAX_SESSION_DURATION_SECONDS || '604800', // 7 days default
  10
);

/**
 * Idle timeout in seconds (default: 30 minutes)
 * Sessions expire after this period of inactivity
 * For SOC 2, 15-30 minutes is recommended
 */
export const IDLE_TIMEOUT_SECONDS = parseInt(
  process.env.IDLE_TIMEOUT_SECONDS || '1800', // 30 minutes default
  10
);

/**
 * Remember me session duration in seconds (default: 30 days)
 * Used when user explicitly selects "Remember me"
 */
export const REMEMBER_ME_DURATION_SECONDS = parseInt(
  process.env.REMEMBER_ME_DURATION_SECONDS || '2592000', // 30 days default
  10
);

// ============================================================================
// Cookie Configuration
// ============================================================================

/**
 * Secure cookie settings for session cookies
 * These are applied by Supabase SSR client
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};

/**
 * Get cookie options based on remember me setting
 */
export function getCookieOptions(rememberMe: boolean = false) {
  return {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: rememberMe ? REMEMBER_ME_DURATION_SECONDS : SESSION_DURATION_SECONDS,
  };
}

// ============================================================================
// Session Validation
// ============================================================================

/**
 * Check if a session timestamp is within valid duration
 */
export function isSessionValid(
  sessionCreatedAt: Date | string | number,
  lastActivityAt?: Date | string | number
): boolean {
  const now = Date.now();
  const sessionStart = new Date(sessionCreatedAt).getTime();
  
  // Check max session duration
  if (now - sessionStart > MAX_SESSION_DURATION_SECONDS * 1000) {
    return false;
  }
  
  // Check idle timeout if last activity provided
  if (lastActivityAt) {
    const lastActive = new Date(lastActivityAt).getTime();
    if (now - lastActive > IDLE_TIMEOUT_SECONDS * 1000) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate when session should expire
 */
export function getSessionExpiry(rememberMe: boolean = false): Date {
  const duration = rememberMe ? REMEMBER_ME_DURATION_SECONDS : SESSION_DURATION_SECONDS;
  return new Date(Date.now() + duration * 1000);
}

/**
 * Calculate idle timeout expiry
 */
export function getIdleExpiry(): Date {
  return new Date(Date.now() + IDLE_TIMEOUT_SECONDS * 1000);
}

// ============================================================================
// Configuration Summary
// ============================================================================

/**
 * Get current session configuration for logging/debugging
 */
export function getSessionConfig() {
  return {
    sessionDuration: `${SESSION_DURATION_SECONDS / 60} minutes`,
    maxSessionDuration: `${MAX_SESSION_DURATION_SECONDS / 86400} days`,
    idleTimeout: `${IDLE_TIMEOUT_SECONDS / 60} minutes`,
    rememberMeDuration: `${REMEMBER_ME_DURATION_SECONDS / 86400} days`,
    cookieSecure: process.env.NODE_ENV === 'production',
  };
}

// Log configuration at startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔐 Session Configuration:', getSessionConfig());
}
