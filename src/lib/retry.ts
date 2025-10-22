/**
 * Retry logic with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 100, // 100ms
  maxDelay: 5000, // 5s
  backoffMultiplier: 2,
  retryableErrors: [
    'PGRST301', // Supabase connection error
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
  ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  const errorCode = error.code;

  return retryableErrors.some(
    (retryable) =>
      errorMessage.includes(retryable) || errorCode === retryable
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt);
  const delay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (random 0-50% of delay)
  const jitter = delay * Math.random() * 0.5;

  return delay + jitter;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if not a retryable error
      if (!isRetryableError(error, config.retryableErrors)) {
        throw error;
      }

      // Don't retry if max retries reached
      if (attempt === config.maxRetries) {
        break;
      }

      // Calculate and apply delay
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      console.log(
        `Retry attempt ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms`,
        error.message || error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wrapper for Supabase queries with automatic retry
 */
export async function withSupabaseRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  return withRetry(
    async () => {
      const result = await queryFn();

      // If Supabase returns an error, throw it to trigger retry
      if (result.error) {
        throw result.error;
      }

      return result;
    },
    {
      maxRetries: 3,
      initialDelay: 200,
      retryableErrors: [
        'PGRST301',
        'connection',
        'timeout',
        'ECONNRESET',
        'ETIMEDOUT',
      ],
    }
  );
}
