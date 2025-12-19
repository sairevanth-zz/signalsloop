import { NextRequest } from 'next/server';

// In-memory rate limit store (use Redis in production for multi-instance deployments)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    dailyCount?: number;
    dailyResetTime?: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now && (!store[key].dailyResetTime || store[key].dailyResetTime! < now)) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  hourlyLimit: number;
  minuteLimit: number;
  dailyLimit?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Rate limit configurations by plan
export const RATE_LIMITS = {
  free: {
    api: {
      hourlyLimit: 5000,
      minuteLimit: 200,
      dailyLimit: 50000,
    },
    webhookManagement: {
      hourlyLimit: 100,
      minuteLimit: 10,
    },
  },
  pro: {
    api: {
      hourlyLimit: 20000,
      minuteLimit: 500,
    },
    webhookManagement: {
      hourlyLimit: 100,
      minuteLimit: 10,
    },
  },
  // Premium uses same limits as pro (or higher if needed)
  premium: {
    api: {
      hourlyLimit: 20000,
      minuteLimit: 500,
    },
    webhookManagement: {
      hourlyLimit: 100,
      minuteLimit: 10,
    },
  },
  // Rate limits for unauthenticated public endpoints
  public: {
    feedback: {
      hourlyLimit: 10,
      minuteLimit: 3,
    },
  },
};

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const hourKey = `hour:${identifier}`;
  const minuteKey = `minute:${identifier}`;
  const dayKey = config.dailyLimit ? `day:${identifier}` : null;

  // Initialize if not exists
  if (!store[hourKey]) {
    store[hourKey] = {
      count: 0,
      resetTime: now + 60 * 60 * 1000, // 1 hour
    };
  }

  if (!store[minuteKey]) {
    store[minuteKey] = {
      count: 0,
      resetTime: now + 60 * 1000, // 1 minute
    };
  }

  if (dayKey && !store[dayKey]) {
    store[dayKey] = {
      count: 0,
      resetTime: now + 24 * 60 * 60 * 1000, // 24 hours
      dailyCount: 0,
      dailyResetTime: now + 24 * 60 * 60 * 1000,
    };
  }

  // Reset if time expired
  if (store[hourKey].resetTime < now) {
    store[hourKey] = {
      count: 0,
      resetTime: now + 60 * 60 * 1000,
    };
  }

  if (store[minuteKey].resetTime < now) {
    store[minuteKey] = {
      count: 0,
      resetTime: now + 60 * 1000,
    };
  }

  if (dayKey && store[dayKey].dailyResetTime! < now) {
    store[dayKey] = {
      count: 0,
      resetTime: now + 24 * 60 * 60 * 1000,
      dailyCount: 0,
      dailyResetTime: now + 24 * 60 * 60 * 1000,
    };
  }

  // Check minute limit (burst protection)
  if (store[minuteKey].count >= config.minuteLimit) {
    return {
      success: false,
      limit: config.minuteLimit,
      remaining: 0,
      reset: Math.ceil(store[minuteKey].resetTime / 1000),
      retryAfter: Math.ceil((store[minuteKey].resetTime - now) / 1000),
    };
  }

  // Check hourly limit
  if (store[hourKey].count >= config.hourlyLimit) {
    return {
      success: false,
      limit: config.hourlyLimit,
      remaining: 0,
      reset: Math.ceil(store[hourKey].resetTime / 1000),
      retryAfter: Math.ceil((store[hourKey].resetTime - now) / 1000),
    };
  }

  // Check daily limit (if configured)
  if (dayKey && config.dailyLimit && store[dayKey].count >= config.dailyLimit) {
    return {
      success: false,
      limit: config.dailyLimit,
      remaining: 0,
      reset: Math.ceil(store[dayKey].dailyResetTime! / 1000),
      retryAfter: Math.ceil((store[dayKey].dailyResetTime! - now) / 1000),
    };
  }

  // Increment counters
  store[hourKey].count++;
  store[minuteKey].count++;
  if (dayKey) {
    store[dayKey].count++;
  }

  // Return success with remaining count (hourly)
  return {
    success: true,
    limit: config.hourlyLimit,
    remaining: config.hourlyLimit - store[hourKey].count,
    reset: Math.ceil(store[hourKey].resetTime / 1000),
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Extract identifier from request (API key or IP)
 */
export async function getIdentifier(request: NextRequest): Promise<string> {
  // Try to get API key from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    // Use last 16 chars of API key as identifier (for privacy)
    return `key:${apiKey.substring(apiKey.length - 16)}`;
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  return `ip:${ip}`;
}

// Cache for API key -> plan mappings (10 minute TTL)
const apiKeyPlanCache = new Map<string, { plan: 'free' | 'pro' | 'premium'; expiresAt: number }>();

/**
 * Get user plan from API key with caching
 */
export async function getUserPlanFromApiKey(apiKey: string): Promise<'free' | 'pro' | 'premium'> {
  // Check cache first
  const cached = apiKeyPlanCache.get(apiKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.plan;
  }

  // Import here to avoid circular dependency
  const crypto = await import('crypto');
  const { getSupabaseServiceRoleClient } = await import('./supabase-client');

  const supabase = getSupabaseServiceRoleClient();
  const keyHash = crypto.default.createHash('sha256').update(apiKey).digest('hex');

  try {
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('project_id, projects(plan)')
      .eq('key_hash', keyHash)
      .single();

    // Recognize both pro and premium as paid plans
    const projectPlan = apiKeyData?.projects?.plan;
    const plan: 'free' | 'pro' | 'premium' =
      projectPlan === 'premium' ? 'premium' :
        projectPlan === 'pro' ? 'pro' :
          'free';

    // Cache for 10 minutes
    apiKeyPlanCache.set(apiKey, {
      plan,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return plan;
  } catch (error) {
    console.error('Error fetching user plan:', error);
    // Cache failure as free plan for 1 minute
    apiKeyPlanCache.set(apiKey, {
      plan: 'free',
      expiresAt: Date.now() + 60 * 1000,
    });
  }

  return 'free';
}

// Cleanup expired cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of apiKeyPlanCache.entries()) {
    if (now > value.expiresAt) {
      apiKeyPlanCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Apply rate limiting to API request
 */
export async function applyRateLimit(
  request: NextRequest,
  type: 'api' | 'webhookManagement' = 'api'
): Promise<RateLimitResult | null> {
  try {
    const identifier = await getIdentifier(request);

    // Get user plan
    let plan: 'free' | 'pro' | 'premium' = 'free';
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);
      plan = await getUserPlanFromApiKey(apiKey);
    }

    // Get rate limit config - premium uses pro limits
    const rateLimitPlan = plan === 'premium' ? 'pro' : plan;
    const config = RATE_LIMITS[rateLimitPlan][type];

    // Check rate limit
    const result = checkRateLimit(identifier, config);

    return result;
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow the request (fail open)
    return null;
  }
}
