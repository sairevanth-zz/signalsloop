import { NextRequest, NextResponse } from 'next/server';
import { secureAPI, validateAPIKey } from '@/lib/api-security';
import { z } from 'zod';

/**
 * Example secure API route demonstrating comprehensive security measures
 * This shows how to use the secureAPI wrapper for maximum protection
 */

// Define request schemas
const CreateExampleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  email: z.string().email(),
  url: z.string().url().optional(),
});

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const QuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'title']).optional(),
});

type CreateExampleBody = z.infer<typeof CreateExampleSchema>;
type ExampleParams = z.infer<typeof ParamsSchema>;

/**
 * GET /api/example-secure
 * List examples with pagination and validation
 */
export const GET = secureAPI<never, never>(
  async ({ query, user, request }) => {
    // Query parameters are already validated by the schema
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const sortBy = query?.sortBy || 'created_at';

    // Your business logic here
    const data = {
      items: [],
      page,
      limit,
      total: 0,
      sortBy,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAPIKey,
    querySchema: QuerySchema,
    corsOrigins: ['https://example.com'], // Configure your allowed origins
  }
);

/**
 * POST /api/example-secure
 * Create a new example with full validation and security
 */
export const POST = secureAPI<CreateExampleBody, never>(
  async ({ body, user, request }) => {
    // Body is already validated and sanitized
    // User is authenticated
    // Rate limiting is applied
    // CSRF protection is enabled
    // Security headers are set

    // Your business logic here
    const newItem = {
      id: crypto.randomUUID(),
      ...body,
      userId: user?.id,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: newItem,
      },
      { status: 201 }
    );
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    enableCSRF: true, // Enable CSRF for state-changing operations
    requireAuth: true,
    authValidator: validateAPIKey,
    bodySchema: CreateExampleSchema,
    sanitizeInput: true,
    corsOrigins: ['https://example.com'],
  }
);

/**
 * PUT /api/example-secure/[id]
 * Update an example with validation
 */
export const PUT = secureAPI<CreateExampleBody, ExampleParams>(
  async ({ body, params, user, request }) => {
    // Both body and params are validated
    const itemId = params!.id;

    // Your business logic here
    const updatedItem = {
      id: itemId,
      ...body,
      userId: user?.id,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  },
  {
    enableRateLimit: true,
    enableCSRF: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    bodySchema: CreateExampleSchema,
    paramsSchema: ParamsSchema,
    sanitizeInput: true,
  }
);

/**
 * DELETE /api/example-secure/[id]
 * Delete an example with security checks
 */
export const DELETE = secureAPI<never, ExampleParams>(
  async ({ params, user, request }) => {
    const itemId = params!.id;

    // Your business logic here
    // Verify ownership, etc.

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
      itemId,
    });
  },
  {
    enableRateLimit: true,
    enableCSRF: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    paramsSchema: ParamsSchema,
  }
);
