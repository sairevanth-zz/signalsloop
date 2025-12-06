/**
 * Security Validation Utilities
 * Validates security configuration at startup and runtime
 * 
 * SECURITY CRITICAL: These checks ensure the application is properly configured
 */

export interface SecurityValidationResult {
  valid: boolean;
  checks: SecurityCheck[];
  criticalErrors: string[];
  warnings: string[];
}

export interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  critical: boolean;
}

/**
 * Validate all security configurations
 */
export function validateSecurityConfig(): SecurityValidationResult {
  const checks: SecurityCheck[] = [];
  const criticalErrors: string[] = [];
  const warnings: string[] = [];

  // 1. Check Supabase configuration
  const supabaseCheck = validateSupabaseConfig();
  checks.push(supabaseCheck);
  if (supabaseCheck.status === 'fail' && supabaseCheck.critical) {
    criticalErrors.push(supabaseCheck.message);
  }

  // 2. Check CSRF secret
  const csrfCheck = validateCSRFSecret();
  checks.push(csrfCheck);
  if (csrfCheck.status === 'fail' && csrfCheck.critical) {
    criticalErrors.push(csrfCheck.message);
  } else if (csrfCheck.status === 'warn') {
    warnings.push(csrfCheck.message);
  }

  // 3. Check encryption key (if encryption is used)
  const encryptionCheck = validateEncryptionKey();
  checks.push(encryptionCheck);
  if (encryptionCheck.status === 'warn') {
    warnings.push(encryptionCheck.message);
  }

  // 4. Check admin configuration
  const adminCheck = validateAdminConfig();
  checks.push(adminCheck);
  if (adminCheck.status === 'fail' && adminCheck.critical) {
    criticalErrors.push(adminCheck.message);
  } else if (adminCheck.status === 'warn') {
    warnings.push(adminCheck.message);
  }

  // 5. Check OpenAI API key
  const openaiCheck = validateOpenAIConfig();
  checks.push(openaiCheck);
  if (openaiCheck.status === 'warn') {
    warnings.push(openaiCheck.message);
  }

  // 6. Check rate limiting configuration
  const rateLimitCheck = validateRateLimitConfig();
  checks.push(rateLimitCheck);
  if (rateLimitCheck.status === 'warn') {
    warnings.push(rateLimitCheck.message);
  }

  // 7. Check session timeout configuration
  const sessionCheck = validateSessionConfig();
  checks.push(sessionCheck);
  if (sessionCheck.status === 'warn') {
    warnings.push(sessionCheck.message);
  }

  return {
    valid: criticalErrors.length === 0,
    checks,
    criticalErrors,
    warnings,
  };
}

/**
 * Validate Supabase configuration
 */
function validateSupabaseConfig(): SecurityCheck {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return {
      name: 'Supabase Configuration',
      status: 'fail',
      message: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
      critical: true,
    };
  }

  if (!serviceKey) {
    return {
      name: 'Supabase Configuration',
      status: 'warn',
      message: 'Missing SUPABASE_SERVICE_ROLE_KEY - some features may not work',
      critical: false,
    };
  }

  return {
    name: 'Supabase Configuration',
    status: 'pass',
    message: 'Supabase is properly configured',
    critical: false,
  };
}

/**
 * Validate CSRF secret
 */
function validateCSRFSecret(): SecurityCheck {
  const secret = process.env.CSRF_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret && isProduction) {
    return {
      name: 'CSRF Protection',
      status: 'fail',
      message: 'CSRF_SECRET not set in production - CSRF protection disabled',
      critical: true,
    };
  }

  if (!secret) {
    return {
      name: 'CSRF Protection',
      status: 'warn',
      message: 'CSRF_SECRET not set - using development fallback',
      critical: false,
    };
  }

  if (secret.length < 32) {
    return {
      name: 'CSRF Protection',
      status: 'fail',
      message: 'CSRF_SECRET is too short (minimum 32 characters)',
      critical: true,
    };
  }

  return {
    name: 'CSRF Protection',
    status: 'pass',
    message: 'CSRF protection properly configured',
    critical: false,
  };
}

/**
 * Validate encryption key
 */
function validateEncryptionKey(): SecurityCheck {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    return {
      name: 'Encryption Key',
      status: 'warn',
      message: 'ENCRYPTION_KEY not set - token encryption unavailable',
      critical: false,
    };
  }

  if (key.length !== 32) {
    return {
      name: 'Encryption Key',
      status: 'fail',
      message: `ENCRYPTION_KEY must be exactly 32 bytes (current: ${key.length})`,
      critical: false, // Not critical since it's optional
    };
  }

  return {
    name: 'Encryption Key',
    status: 'pass',
    message: 'Encryption key properly configured',
    critical: false,
  };
}

/**
 * Validate admin configuration
 */
function validateAdminConfig(): SecurityCheck {
  const adminUserIds = process.env.ADMIN_USER_IDS;
  const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!adminUserIds && !adminEmails) {
    if (isProduction) {
      return {
        name: 'Admin Configuration',
        status: 'fail',
        message: 'No admin users configured (ADMIN_USER_IDS or ADMIN_EMAILS required)',
        critical: true,
      };
    }
    return {
      name: 'Admin Configuration',
      status: 'warn',
      message: 'No admin users configured - admin endpoints will be inaccessible',
      critical: false,
    };
  }

  return {
    name: 'Admin Configuration',
    status: 'pass',
    message: 'Admin access properly configured',
    critical: false,
  };
}

/**
 * Validate OpenAI configuration
 */
function validateOpenAIConfig(): SecurityCheck {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      name: 'OpenAI Configuration',
      status: 'warn',
      message: 'OPENAI_API_KEY not set - AI features unavailable',
      critical: false,
    };
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      name: 'OpenAI Configuration',
      status: 'warn',
      message: 'OPENAI_API_KEY format looks incorrect',
      critical: false,
    };
  }

  return {
    name: 'OpenAI Configuration',
    status: 'pass',
    message: 'OpenAI API key configured',
    critical: false,
  };
}

/**
 * Validate rate limiting configuration
 */
function validateRateLimitConfig(): SecurityCheck {
  // Rate limiting uses Upstash Redis if available
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return {
      name: 'Rate Limiting',
      status: 'warn',
      message: 'Upstash Redis not configured - using in-memory rate limiting',
      critical: false,
    };
  }

  return {
    name: 'Rate Limiting',
    status: 'pass',
    message: 'Rate limiting properly configured with Redis',
    critical: false,
  };
}

/**
 * Validate session configuration
 */
function validateSessionConfig(): SecurityCheck {
  const sessionDuration = parseInt(process.env.SESSION_DURATION_SECONDS || '3600', 10);
  const idleTimeout = parseInt(process.env.IDLE_TIMEOUT_SECONDS || '1800', 10);
  
  // For SOC 2: session should be max 4 hours, idle timeout 15-30 min
  const isSessionTooLong = sessionDuration > 14400; // 4 hours
  const isIdleTooLong = idleTimeout > 3600; // 1 hour
  
  if (isSessionTooLong || isIdleTooLong) {
    return {
      name: 'Session Timeout',
      status: 'warn',
      message: `Session settings may be too lenient for SOC 2 (session: ${sessionDuration/60}min, idle: ${idleTimeout/60}min)`,
      critical: false,
    };
  }

  return {
    name: 'Session Timeout',
    status: 'pass',
    message: `Session timeout configured (session: ${sessionDuration/60}min, idle: ${idleTimeout/60}min)`,
    critical: false,
  };
}

/**
 * Run security validation at startup (call this in instrumentation.ts or layout)
 */
export function runStartupSecurityValidation(): void {
  const result = validateSecurityConfig();
  
  console.log('\n🔒 Security Configuration Check');
  console.log('================================');
  
  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${check.name}: ${check.message}`);
  }
  
  if (result.criticalErrors.length > 0) {
    console.error('\n🚨 CRITICAL SECURITY ERRORS:');
    for (const error of result.criticalErrors) {
      console.error(`   - ${error}`);
    }
    
    // In production, throw to prevent startup with critical security issues
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Security validation failed: ${result.criticalErrors.join('; ')}`
      );
    }
  }
  
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Security Warnings:');
    for (const warning of result.warnings) {
      console.warn(`   - ${warning}`);
    }
  }
  
  console.log('================================\n');
}

/**
 * Get security status for health endpoint
 */
export function getSecurityHealthStatus(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{ name: string; status: string }>;
} {
  const result = validateSecurityConfig();
  
  const status = result.criticalErrors.length > 0 
    ? 'unhealthy' 
    : result.warnings.length > 0 
      ? 'degraded' 
      : 'healthy';
  
  return {
    status,
    checks: result.checks.map(c => ({ 
      name: c.name, 
      status: c.status 
    })),
  };
}
