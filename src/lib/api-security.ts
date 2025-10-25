import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { withRateLimit } from '@/middleware/rate-limit';
import { withCSRFProtection } from './csrf-protection';
import { applySecurityHeaders } from './security-headers';
import { sanitizeObject } from './input-validation';
import {
  logValidationError,
  logAuthenticationFailed,
  extractRequestMetadata,
} from './security-logger';

/**
 * Comprehensive API Security Wrapper
 * Combines all security measures into a single wrapper
 */

export interface SecureAPIOptions<TBody = any, TParams = any> {
  // Rate limiting
  enableRateLimit?: boolean;
  rateLimitType?: 'api' | 'webhookManagement';

  // CSRF protection
  enableCSRF?: boolean;

  // Authentication
  requireAuth?: boolean;
  authValidator?: (request: NextRequest) => Promise<{
    valid: boolean;
    user?: any;
    error?: string;
  }>;

  // Input validation
  bodySchema?: ZodSchema<TBody>;
  paramsSchema?: ZodSchema<TParams>;
  querySchema?: ZodSchema<any>;

  // Request sanitization
  sanitizeInput?: boolean;

  // Custom headers
  customHeaders?: Record<string, string>;

  // CORS
  corsOrigins?: string[];
}

export interface SecureAPIContext<TBody = any, TParams = any> {
  request: NextRequest;
  body?: TBody;
  params?: TParams;
  query?: Record<string, string>;
  user?: any;
}

/**
 * Secure API route wrapper
 */
export function secureAPI<TBody = any, TParams = any, TResponse = any>(
  handler: (context: SecureAPIContext<TBody, TParams>) => Promise<NextResponse>,
  options: SecureAPIOptions<TBody, TParams> = {}
) {
  return async (
    request: NextRequest,
    routeContext?: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    const {
      enableRateLimit = true,
      rateLimitType = 'api',
      enableCSRF = false,
      requireAuth = false,
      authValidator,
      bodySchema,
      paramsSchema,
      querySchema,
      sanitizeInput = true,
      customHeaders = {},
      corsOrigins = [],
    } = options;

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORS(request, corsOrigins);
      }

      // Build context
      const context: SecureAPIContext<TBody, TParams> = {
        request,
      };

      // Rate limiting
      if (enableRateLimit) {
        const rateLimitResult = await withRateLimit(
          request,
          async () => NextResponse.json({ success: true }),
          rateLimitType
        );

        if (rateLimitResult.status === 429) {
          return applySecurityHeaders(rateLimitResult);
        }
      }

      // CSRF protection
      if (enableCSRF) {
        const csrfResult = await withCSRFProtection(request, async () =>
          NextResponse.json({ success: true })
        );

        if (csrfResult.status === 403) {
          return applySecurityHeaders(csrfResult);
        }
      }

      // Authentication
      if (requireAuth) {
        if (!authValidator) {
          throw new Error('authValidator is required when requireAuth is true');
        }

        const authResult = await authValidator(request);
        if (!authResult.valid) {
          logAuthenticationFailed(request, authResult.error || 'Unknown error');

          const response = NextResponse.json(
            {
              error: 'Unauthorized',
              message: authResult.error || 'Authentication required',
            },
            { status: 401 }
          );
          return applySecurityHeaders(response);
        }

        context.user = authResult.user;
      }

      // Parse and validate body
      if (bodySchema) {
        try {
          const rawBody = await request.json();
          const sanitized = sanitizeInput ? sanitizeObject(rawBody) : rawBody;
          const validated = bodySchema.parse(sanitized);
          context.body = validated;
        } catch (error) {
          const metadata = extractRequestMetadata(request);
          logValidationError(
            request,
            'body',
            error instanceof Error ? error.message : 'Validation failed'
          );

          const response = NextResponse.json(
            {
              error: 'Validation Error',
              message: 'Invalid request body',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 400 }
          );
          return applySecurityHeaders(response);
        }
      }

      // Parse and validate params
      if (paramsSchema && routeContext?.params) {
        try {
          const rawParams = await routeContext.params;
          const validated = paramsSchema.parse(rawParams);
          context.params = validated;
        } catch (error) {
          logValidationError(
            request,
            'params',
            error instanceof Error ? error.message : 'Validation failed'
          );

          const response = NextResponse.json(
            {
              error: 'Validation Error',
              message: 'Invalid request parameters',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 400 }
          );
          return applySecurityHeaders(response);
        }
      }

      // Parse and validate query
      if (querySchema) {
        try {
          const query: Record<string, string> = {};
          request.nextUrl.searchParams.forEach((value, key) => {
            query[key] = value;
          });
          const validated = querySchema.parse(query);
          context.query = validated;
        } catch (error) {
          logValidationError(
            request,
            'query',
            error instanceof Error ? error.message : 'Validation failed'
          );

          const response = NextResponse.json(
            {
              error: 'Validation Error',
              message: 'Invalid query parameters',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 400 }
          );
          return applySecurityHeaders(response);
        }
      }

      // Execute handler
      const response = await handler(context);

      // Apply custom headers
      Object.entries(customHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Apply CORS headers
      if (corsOrigins.length > 0) {
        applyCORSHeaders(response, request, corsOrigins);
      }

      // Apply security headers
      return applySecurityHeaders(response);
    } catch (error) {
      console.error('API Security Error:', error);

      const response = NextResponse.json(
        {
          error: 'Internal Server Error',
          message:
            process.env.NODE_ENV === 'development'
              ? error instanceof Error
                ? error.message
                : 'Unknown error'
              : 'An error occurred',
        },
        { status: 500 }
      );

      return applySecurityHeaders(response);
    }
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: NextRequest, allowedOrigins: string[]): NextResponse {
  const origin = request.headers.get('origin');

  if (!origin || !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  applyCORSHeaders(response, request, allowedOrigins);
  return response;
}

/**
 * Apply CORS headers to response
 */
function applyCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  allowedOrigins: string[]
): void {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * Default API key validator
 */
export async function validateAPIKey(request: NextRequest): Promise<{
  valid: boolean;
  user?: any;
  project?: any;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const apiKey = authHeader.replace('Bearer ', '');

  try {
    const crypto = await import('crypto');
    const { getSupabaseServiceRoleClient } = await import('./secure-supabase');

    const supabase = getSupabaseServiceRoleClient();
    const keyHash = crypto.default.createHash('sha256').update(apiKey).digest('hex');

    const { data: apiKeyData, error } = await supabase
      .from('api_keys')
      .select(
        `
        *,
        projects!inner(id, slug, name, plan, user_id)
      `
      )
      .eq('key_hash', keyHash)
      .single();

    if (error || !apiKeyData) {
      return { valid: false, error: 'Invalid API key' };
    }

    return {
      valid: true,
      project: apiKeyData.projects,
      user: { id: apiKeyData.projects.user_id },
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}

/**
 * Basic authentication validator (JWT-based) - checks if user is authenticated
 */
export async function validateAuth(request: NextRequest): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { valid: false, error: 'Invalid authentication token' };
    }

    return {
      valid: true,
      user,
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}

/**
 * Admin authentication validator (JWT-based)
 */
export async function validateAdminAuth(request: NextRequest): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { valid: false, error: 'Invalid authentication token' };
    }

    // Check if user is admin
    const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

    if (!ADMIN_USER_IDS.includes(user.id)) {
      return { valid: false, error: 'Admin access required' };
    }

    return {
      valid: true,
      user,
    };
  } catch (error) {
    console.error('Admin auth validation error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}

/**
 * Example usage:
 *
 * export const POST = secureAPI<CreatePostBody, { id: string }>(
 *   async ({ body, params, user }) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     enableRateLimit: true,
 *     enableCSRF: true,
 *     requireAuth: true,
 *     authValidator: validateAPIKey,
 *     bodySchema: z.object({
 *       title: z.string().min(1).max(200),
 *       content: z.string().max(5000),
 *     }),
 *     paramsSchema: z.object({
 *       id: z.string().uuid(),
 *     }),
 *   }
 * );
 */
