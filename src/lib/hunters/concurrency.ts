/**
 * Hunter Concurrency Controls
 * 
 * Provides scalability controls for the hunter feature:
 * - Per-customer job limits
 * - OpenAI rate limiting
 * - Global concurrency limits
 * - Priority queuing support
 * - Circuit breaker pattern for external APIs
 */

import { Redis } from '@upstash/redis';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

// ============================================
// Configuration
// ============================================

const CONFIG = {
    // Per-customer limits
    MAX_CONCURRENT_JOBS_PER_PROJECT: 2,   // Max jobs per project at once
    MAX_PENDING_SCANS_PER_PROJECT: 1,     // Max scans waiting in queue

    // Global limits
    MAX_GLOBAL_CONCURRENT_JOBS: 20,       // Max jobs processing across all customers

    // OpenAI rate limits (requests per minute)
    OPENAI_RATE_LIMIT: 50,                // 50 requests per minute global
    OPENAI_RATE_WINDOW: 60,               // 60 second window

    // Circuit breaker config
    CIRCUIT_BREAKER_THRESHOLD: 3,         // Failures before opening circuit
    CIRCUIT_BREAKER_TIMEOUT: 300,         // Seconds before retry (5 min)
};

// ============================================
// Redis Client Singleton
// ============================================

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
    if (redisClient) return redisClient;

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            redisClient = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN,
            });
            return redisClient;
        } catch (error) {
            console.error('[Concurrency] Failed to init Redis:', error);
            return null;
        }
    }
    return null;
}

// ============================================
// Phase 1: Per-Customer Job Limits
// ============================================

export interface ConcurrencyCheckResult {
    allowed: boolean;
    reason?: string;
    currentCount?: number;
    limit?: number;
}

/**
 * Check if a project can start a new scan
 * Returns allowed=false if project already has max concurrent jobs
 */
export async function checkProjectConcurrency(projectId: string): Promise<ConcurrencyCheckResult> {
    const supabase = getServiceRoleClient();
    if (!supabase) {
        // Allow if DB unavailable (fail open)
        return { allowed: true };
    }

    try {
        // Count active jobs for this project
        const { count, error } = await supabase
            .from('hunter_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .in('status', ['pending', 'processing']);

        if (error) {
            console.error('[Concurrency] Error checking project jobs:', error);
            return { allowed: true }; // Fail open
        }

        const currentCount = count || 0;
        const limit = CONFIG.MAX_CONCURRENT_JOBS_PER_PROJECT;

        if (currentCount >= limit) {
            return {
                allowed: false,
                reason: `Project already has ${currentCount} jobs in progress. Please wait for current scan to complete.`,
                currentCount,
                limit,
            };
        }

        return { allowed: true, currentCount, limit };
    } catch (error) {
        console.error('[Concurrency] checkProjectConcurrency error:', error);
        return { allowed: true }; // Fail open
    }
}

/**
 * Check if a project has too many pending scans
 */
export async function checkPendingScanLimit(projectId: string): Promise<ConcurrencyCheckResult> {
    const supabase = getServiceRoleClient();
    if (!supabase) return { allowed: true };

    try {
        const { count, error } = await supabase
            .from('hunter_scans')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .eq('status', 'running');

        if (error) {
            console.error('[Concurrency] Error checking pending scans:', error);
            return { allowed: true };
        }

        const currentCount = count || 0;
        const limit = CONFIG.MAX_PENDING_SCANS_PER_PROJECT;

        if (currentCount >= limit) {
            return {
                allowed: false,
                reason: 'A scan is already running for this project. Please wait for it to complete.',
                currentCount,
                limit,
            };
        }

        return { allowed: true, currentCount, limit };
    } catch (error) {
        console.error('[Concurrency] checkPendingScanLimit error:', error);
        return { allowed: true };
    }
}

// ============================================
// Phase 2: OpenAI Rate Limiting
// ============================================

/**
 * Check OpenAI rate limit using sliding window
 * Uses Redis for distributed rate limiting across all instances
 */
export async function checkOpenAIRateLimit(): Promise<ConcurrencyCheckResult> {
    const redis = getRedis();
    if (!redis) {
        // No Redis = no rate limiting (log warning)
        console.warn('[RateLimit] Redis not available, skipping rate limit check');
        return { allowed: true };
    }

    try {
        const key = 'ratelimit:openai:global';
        const now = Date.now();
        const windowStart = now - (CONFIG.OPENAI_RATE_WINDOW * 1000);

        // Use Redis sorted set for sliding window
        // Remove old entries
        await redis.zremrangebyscore(key, 0, windowStart);

        // Count current requests
        const currentCount = await redis.zcard(key);

        if (currentCount >= CONFIG.OPENAI_RATE_LIMIT) {
            return {
                allowed: false,
                reason: `OpenAI rate limit reached (${currentCount}/${CONFIG.OPENAI_RATE_LIMIT} per minute). Retrying soon.`,
                currentCount,
                limit: CONFIG.OPENAI_RATE_LIMIT,
            };
        }

        // Add this request
        await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
        // Set TTL on key to auto-cleanup
        await redis.expire(key, CONFIG.OPENAI_RATE_WINDOW + 10);

        return {
            allowed: true,
            currentCount: currentCount + 1,
            limit: CONFIG.OPENAI_RATE_LIMIT
        };
    } catch (error) {
        console.error('[RateLimit] OpenAI rate limit check error:', error);
        return { allowed: true }; // Fail open
    }
}

/**
 * Record an OpenAI request (call after successful request)
 */
export async function recordOpenAIRequest(): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = 'ratelimit:openai:global';
        const now = Date.now();
        await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
        await redis.expire(key, CONFIG.OPENAI_RATE_WINDOW + 10);
    } catch (error) {
        console.error('[RateLimit] Error recording OpenAI request:', error);
    }
}

// ============================================
// Phase 3: Global Concurrency Control
// ============================================

/**
 * Check global concurrency across all customers
 * Prevents system overload when many customers scan simultaneously
 */
export async function checkGlobalConcurrency(): Promise<ConcurrencyCheckResult> {
    const supabase = getServiceRoleClient();
    if (!supabase) return { allowed: true };

    try {
        const { count, error } = await supabase
            .from('hunter_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'processing');

        if (error) {
            console.error('[Concurrency] Error checking global concurrency:', error);
            return { allowed: true };
        }

        const currentCount = count || 0;
        const limit = CONFIG.MAX_GLOBAL_CONCURRENT_JOBS;

        if (currentCount >= limit) {
            console.log(`[Concurrency] Global limit reached (${currentCount}/${limit}), skipping`);
            return {
                allowed: false,
                reason: `System is processing maximum concurrent jobs. Job queued for next available slot.`,
                currentCount,
                limit,
            };
        }

        return { allowed: true, currentCount, limit };
    } catch (error) {
        console.error('[Concurrency] checkGlobalConcurrency error:', error);
        return { allowed: true };
    }
}

// ============================================
// Phase 4: Priority Queue Support
// ============================================

export type PriorityLevel = 'free' | 'pro' | 'premium' | 'enterprise';

const PRIORITY_SCORES: Record<PriorityLevel, number> = {
    free: 0,
    pro: 10,
    premium: 20,
    enterprise: 30,
};

/**
 * Get priority score for a project based on subscription plan
 */
export async function getProjectPriority(projectId: string): Promise<number> {
    const supabase = getServiceRoleClient();
    if (!supabase) return PRIORITY_SCORES.free;

    try {
        // Get project owner and their subscription
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return PRIORITY_SCORES.free;
        }

        // Check subscription status
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('plan_id')
            .eq('user_id', project.owner_id)
            .eq('status', 'active')
            .single();

        if (subError || !subscription) {
            return PRIORITY_SCORES.free;
        }

        // Map plan_id to priority
        const planId = subscription.plan_id?.toLowerCase() || '';
        if (planId.includes('enterprise')) return PRIORITY_SCORES.enterprise;
        if (planId.includes('premium')) return PRIORITY_SCORES.premium;
        if (planId.includes('pro')) return PRIORITY_SCORES.pro;

        return PRIORITY_SCORES.free;
    } catch (error) {
        console.error('[Priority] Error getting project priority:', error);
        return PRIORITY_SCORES.free;
    }
}

// ============================================
// Phase 5: Circuit Breaker Pattern
// ============================================

interface CircuitState {
    failures: number;
    lastFailure: number | null;
    open: boolean;
    openedAt: number | null;
}

const REDIS_CIRCUIT_KEY_PREFIX = 'circuit:hunter:';

/**
 * Check if circuit is open (API is failing)
 */
export async function isCircuitOpen(platform: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false; // No Redis = no circuit breaker

    try {
        const key = `${REDIS_CIRCUIT_KEY_PREFIX}${platform}`;
        const state = await redis.get<CircuitState>(key);

        if (!state) return false;

        if (!state.open) return false;

        // Check if timeout has passed (circuit should try again)
        const now = Date.now();
        const openedAt = state.openedAt || 0;
        if (now - openedAt > CONFIG.CIRCUIT_BREAKER_TIMEOUT * 1000) {
            // Reset to half-open state (allow one request)
            await redis.set(key, { ...state, open: false }, { ex: 600 });
            console.log(`[CircuitBreaker] ${platform} circuit half-open, allowing retry`);
            return false;
        }

        console.log(`[CircuitBreaker] ${platform} circuit is OPEN, skipping`);
        return true;
    } catch (error) {
        console.error('[CircuitBreaker] Error checking circuit:', error);
        return false;
    }
}

/**
 * Record a platform API failure
 */
export async function recordPlatformFailure(platform: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = `${REDIS_CIRCUIT_KEY_PREFIX}${platform}`;
        const existing = await redis.get<CircuitState>(key) || {
            failures: 0,
            lastFailure: null,
            open: false,
            openedAt: null,
        };

        const now = Date.now();
        const newFailures = existing.failures + 1;

        // Check if we should open the circuit
        const shouldOpen = newFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD;

        const newState: CircuitState = {
            failures: newFailures,
            lastFailure: now,
            open: shouldOpen,
            openedAt: shouldOpen ? now : existing.openedAt,
        };

        await redis.set(key, newState, { ex: 600 }); // 10 min TTL

        if (shouldOpen) {
            console.warn(`[CircuitBreaker] ${platform} circuit OPENED after ${newFailures} failures`);
        } else {
            console.log(`[CircuitBreaker] ${platform} failure recorded (${newFailures}/${CONFIG.CIRCUIT_BREAKER_THRESHOLD})`);
        }
    } catch (error) {
        console.error('[CircuitBreaker] Error recording failure:', error);
    }
}

/**
 * Record a platform API success (reset failure count)
 */
export async function recordPlatformSuccess(platform: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = `${REDIS_CIRCUIT_KEY_PREFIX}${platform}`;
        const existing = await redis.get<CircuitState>(key);

        if (existing && (existing.failures > 0 || existing.open)) {
            // Reset the circuit
            await redis.set(key, {
                failures: 0,
                lastFailure: null,
                open: false,
                openedAt: null,
            }, { ex: 600 });
            console.log(`[CircuitBreaker] ${platform} circuit reset after success`);
        }
    } catch (error) {
        console.error('[CircuitBreaker] Error recording success:', error);
    }
}

/**
 * Get circuit breaker status for all platforms
 */
export async function getCircuitBreakerStatus(): Promise<Record<string, CircuitState | null>> {
    const redis = getRedis();
    if (!redis) return {};

    const platforms = ['reddit', 'hackernews', 'twitter', 'trustpilot', 'g2', 'playstore'];
    const status: Record<string, CircuitState | null> = {};

    for (const platform of platforms) {
        try {
            const key = `${REDIS_CIRCUIT_KEY_PREFIX}${platform}`;
            status[platform] = await redis.get<CircuitState>(key);
        } catch (error) {
            status[platform] = null;
        }
    }

    return status;
}

// ============================================
// Utility: Combined Pre-flight Check
// ============================================

/**
 * Run all pre-flight checks before starting a scan
 */
export async function runPreflightChecks(projectId: string): Promise<ConcurrencyCheckResult> {
    // Check 1: Project concurrency
    const projectCheck = await checkPendingScanLimit(projectId);
    if (!projectCheck.allowed) return projectCheck;

    // Check 2: Global concurrency (less strict, just log)
    const globalCheck = await checkGlobalConcurrency();
    if (!globalCheck.allowed) {
        console.log('[Preflight] Global limit reached, but allowing queue');
        // We allow queuing, just log the warning
    }

    return { allowed: true };
}

/**
 * Run pre-claim checks before a worker claims a job
 */
export async function runWorkerPreclaimChecks(): Promise<ConcurrencyCheckResult> {
    // Check global concurrency
    const globalCheck = await checkGlobalConcurrency();
    if (!globalCheck.allowed) return globalCheck;

    return { allowed: true };
}
