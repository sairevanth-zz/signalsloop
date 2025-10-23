# SecureAPI Migration Guide

## Overview

This guide explains how to migrate existing API routes to use the `secureAPI()` wrapper for consistent rate limiting, authentication, validation, and security headers.

## Benefits

✅ **Automatic rate limiting** - Prevents API abuse
✅ **Built-in authentication** - JWT or API key validation
✅ **Input validation** - Zod schema validation
✅ **Input sanitization** - XSS prevention
✅ **Security headers** - CSP, X-Frame-Options, etc.
✅ **CSRF protection** - Optional double-submit cookie
✅ **Error handling** - Consistent error responses
✅ **Cleaner code** - 50-70% less boilerplate

## Basic Pattern

### Before (Old Pattern)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Manual auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(...);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Manual validation
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Business logic
    const data = await fetchData(id);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### After (SecureAPI Pattern)
```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureAPI, validateAdminAuth } from '@/lib/api-security';

export const GET = secureAPI(
  async ({ query }) => {
    const { id } = query!;

    // Business logic only
    const data = await fetchData(id);

    return NextResponse.json({ data });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    querySchema: z.object({
      id: z.string().uuid(),
    }),
  }
);
```

**Result: 60% less code, automatic rate limiting, validation, and security!**

## Authentication Validators

### 1. Admin Authentication (JWT)
```typescript
import { validateAdminAuth } from '@/lib/api-security';

export const POST = secureAPI(
  async ({ body, user }) => {
    // user.id is available here
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
```

### 2. API Key Authentication
```typescript
import { validateAPIKey } from '@/lib/api-security';

export const POST = secureAPI(
  async ({ body, user }) => {
    // user.id and project data available
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    authValidator: validateAPIKey,
  }
);
```

### 3. No Authentication (Public Routes)
```typescript
export const GET = secureAPI(
  async () => {
    return NextResponse.json({ data: 'public' });
  },
  {
    enableRateLimit: true,
    requireAuth: false,
  }
);
```

## Validation Patterns

### Query Parameters
```typescript
export const GET = secureAPI(
  async ({ query }) => {
    const { id, page, limit } = query!;
    // All validated and type-safe
  },
  {
    querySchema: z.object({
      id: z.string().uuid(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
  }
);
```

### Request Body
```typescript
export const POST = secureAPI(
  async ({ body }) => {
    const { title, description } = body!;
    // Validated and sanitized
  },
  {
    bodySchema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(5000).optional(),
    }),
  }
);
```

### URL Parameters
```typescript
export const GET = secureAPI<any, { id: string }>(
  async ({ params }) => {
    const { id } = params!;
    // Validated UUID
  },
  {
    paramsSchema: z.object({
      id: z.string().uuid(),
    }),
  }
);
```

## Migration Checklist

For each route:

- [ ] Import `secureAPI` and appropriate `authValidator`
- [ ] Replace `export async function METHOD` with `export const METHOD = secureAPI`
- [ ] Move business logic into handler function
- [ ] Remove manual auth checks
- [ ] Remove manual validation
- [ ] Add validation schemas
- [ ] Test the endpoint

## Common Patterns

### Pattern 1: Admin-Only GET
```typescript
export const GET = secureAPI(
  async () => {
    const data = await fetchData();
    return NextResponse.json({ data });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
  }
);
```

### Pattern 2: Admin-Only POST with Body Validation
```typescript
export const POST = secureAPI(
  async ({ body }) => {
    await createResource(body!);
    return NextResponse.json({ success: true });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    bodySchema: z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }),
  }
);
```

### Pattern 3: Public API with API Key
```typescript
export const POST = secureAPI(
  async ({ body, user }) => {
    // user contains project info from API key
    await processRequest(user.project.id, body!);
    return NextResponse.json({ success: true });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    requireAuth: true,
    authValidator: validateAPIKey,
    bodySchema: z.object({
      data: z.string(),
    }),
  }
);
```

### Pattern 4: Route with Query and Params
```typescript
export const GET = secureAPI<any, { projectId: string }>(
  async ({ params, query }) => {
    const { projectId } = params!;
    const { filter } = query!;

    const data = await fetchFiltered(projectId, filter);
    return NextResponse.json({ data });
  },
  {
    enableRateLimit: true,
    requireAuth: true,
    authValidator: validateAdminAuth,
    paramsSchema: z.object({
      projectId: z.string().uuid(),
    }),
    querySchema: z.object({
      filter: z.enum(['active', 'inactive', 'all']).default('all'),
    }),
  }
);
```

## Rate Limit Types

```typescript
{
  rateLimitType: 'api' // Default: 1000/hour
  rateLimitType: 'webhookManagement' // Special limits for webhooks
}
```

## Migration Priority

### High Priority (Security-Critical)
1. ✅ Admin backup routes - DONE
2. Admin user management routes
3. Admin settings routes
4. Payment/Stripe routes
5. API key generation routes

### Medium Priority
6. Public API (v1) routes
7. AI/OpenAI routes
8. Webhook routes
9. Posts/Comments routes

### Low Priority (Already Have Some Protection)
10. Public endpoints (sitemap, robots.txt)
11. Health check endpoints
12. Debug/test endpoints (remove in production)

## Testing After Migration

1. **Test authentication**: Verify unauthorized requests are rejected
2. **Test validation**: Send invalid data and verify proper 400 errors
3. **Test rate limiting**: Make rapid requests and verify 429 responses
4. **Test business logic**: Ensure the endpoint still works correctly
5. **Check logs**: Verify security events are being logged

## Examples from Codebase

### ✅ Migrated: `/api/admin/backups/route.ts`
- 160 lines → 67 lines (58% reduction)
- Automatic rate limiting added
- Admin auth enforced
- Security headers applied

### ✅ Migrated: `/api/admin/backups/download/route.ts`
- 65 lines → 35 lines (46% reduction)
- Query validation added
- Cleaner error handling

## Common Issues

### Issue: "Cannot find module '@/lib/api-security'"
**Solution**: Make sure import path is correct and file exists

### Issue: Type errors with params
**Solution**: Use type parameter: `secureAPI<BodyType, ParamsType>`

### Issue: Rate limit too strict
**Solution**: Adjust rate limit type or create custom limits in middleware

### Issue: Body not being parsed
**Solution**: Make sure to provide `bodySchema` option

## Need Help?

- Check `/src/app/api/example-secure/route.ts` for examples
- Check `/src/app/api/admin/backups/*` for real implementations
- Review `/src/lib/api-security.ts` for full API documentation

---

**Status**: In Progress
**Updated**: 2025-10-23
**Migrated Routes**: 5/80 (6%)
