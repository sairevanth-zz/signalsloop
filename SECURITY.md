# Security Implementation Guide

This document describes the comprehensive security measures implemented in SignalLoop.

## Overview

SignalLoop implements multiple layers of security protection:

1. **Rate Limiting** - Prevents abuse and DDoS attacks
2. **Input Validation & Sanitization** - Protects against injection attacks
3. **SQL Injection Prevention** - Safe database query patterns
4. **XSS Protection** - Sanitizes user input and sets security headers
5. **CSRF Protection** - Double Submit Cookie pattern
6. **Security Headers** - CSP, HSTS, and other protective headers
7. **Authentication & Authorization** - API key validation and user verification
8. **Security Logging** - Audit trail for security events

## Rate Limiting

### Implementation

Rate limiting is implemented using an in-memory store with the following limits:

**Free Plan:**
- API: 5,000 requests/hour, 200 requests/minute, 50,000 requests/day
- Webhook Management: 100 requests/hour, 10 requests/minute

**Pro Plan:**
- API: 20,000 requests/hour, 500 requests/minute
- Webhook Management: 100 requests/hour, 10 requests/minute

### Usage

```typescript
import { withRateLimit } from '@/middleware/rate-limit';

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    // Your handler logic
    return NextResponse.json({ data: 'response' });
  }, 'api');
}
```

### Files
- `src/lib/rate-limit.ts` - Core rate limiting logic
- `src/middleware/rate-limit.ts` - Middleware wrapper

## Input Validation & Sanitization

### Features

- **HTML Sanitization** - Removes malicious HTML/JavaScript
- **Email Validation** - RFC-compliant email validation
- **URL Validation** - Prevents JavaScript and data URLs
- **Slug Validation** - Safe project slugs
- **UUID Validation** - Strict UUID v4 validation
- **File Upload Validation** - Type and size checks
- **Prototype Pollution Prevention** - Sanitizes object keys

### Usage

```typescript
import { sanitizeHTML, validateEmail, commonSchemas } from '@/lib/input-validation';
import { z } from 'zod';

// Sanitize HTML content
const safe = sanitizeHTML(userInput);

// Validate email
const result = validateEmail(email);
if (!result.valid) {
  throw new Error(result.error);
}

// Use Zod schemas
const PostSchema = z.object({
  title: commonSchemas.title,
  description: commonSchemas.description,
  email: commonSchemas.email,
  url: commonSchemas.url,
});
```

### Files
- `src/lib/input-validation.ts` - Validation and sanitization utilities

## SQL Injection Prevention

### Best Practices

1. **Always use Supabase's query builder** - Never concatenate SQL strings
2. **Validate all identifiers** - Table names, column names
3. **Use the secure query builder** - Built-in validation
4. **Validate UUIDs** - Before using in queries
5. **Use Row Level Security (RLS)** - Database-level protection

### Usage

```typescript
import { secureQuery } from '@/lib/secure-supabase';

// Safe query with automatic validation
const posts = await secureQuery('posts')
  .select(['id', 'title', 'content'])
  .list({
    limit: 10,
    sortColumn: 'created_at',
    sortDirection: 'desc'
  });

// Safe single record fetch
const post = await secureQuery('posts')
  .selectById(postId, ['id', 'title', 'content']);

// Safe insert
await secureQuery('posts').insert({
  title: 'Hello',
  content: 'World'
});

// Safe update
await secureQuery('posts').update(postId, {
  title: 'Updated'
});
```

### Files
- `src/lib/sql-safety.ts` - SQL injection prevention utilities
- `src/lib/secure-supabase.ts` - Secure Supabase client wrapper

## XSS Protection

### Implementation

1. **Input Sanitization** - All user input is sanitized
2. **Output Encoding** - React's built-in XSS protection
3. **Content Security Policy** - Restricts script sources
4. **X-XSS-Protection Header** - Legacy browser protection

### Usage

```typescript
import { sanitizeHTML, sanitizePlainText } from '@/lib/input-validation';

// For rich text (allows some HTML)
const safeHTML = sanitizeHTML(userInput);

// For plain text (removes all HTML)
const safePlainText = sanitizePlainText(userInput);
```

### Files
- `src/lib/input-validation.ts` - XSS sanitization
- `src/lib/security-headers.ts` - Security headers including CSP

## CSRF Protection

### Implementation

Double Submit Cookie pattern with secure, httpOnly cookies.

### Usage

**Backend - Protected Route:**
```typescript
import { withCSRFProtection } from '@/lib/csrf-protection';

export async function POST(request: NextRequest) {
  return withCSRFProtection(request, async () => {
    // Your handler logic
    return NextResponse.json({ success: true });
  });
}
```

**Frontend - Get Token:**
```typescript
// Get CSRF token
const response = await fetch('/api/csrf-token');
const { csrfToken } = await response.json();

// Include in requests
await fetch('/api/protected', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

### Files
- `src/lib/csrf-protection.ts` - CSRF protection utilities
- `src/app/api/csrf-token/route.ts` - Token generation endpoint

## Security Headers

### Headers Applied

1. **Content-Security-Policy** - Restricts resource loading
2. **Strict-Transport-Security** - Forces HTTPS
3. **X-Frame-Options** - Prevents clickjacking
4. **X-Content-Type-Options** - Prevents MIME sniffing
5. **X-XSS-Protection** - Legacy XSS protection
6. **Referrer-Policy** - Controls referrer information
7. **Permissions-Policy** - Controls browser features

### Configuration

Headers are automatically applied by the middleware to all responses.

### Files
- `src/lib/security-headers.ts` - Security headers configuration
- `src/middleware.ts` - Applies headers to all routes

## Comprehensive API Security

### The `secureAPI` Wrapper

A comprehensive wrapper that combines all security measures:

```typescript
import { secureAPI, validateAPIKey } from '@/lib/api-security';
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000),
});

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export const POST = secureAPI<
  z.infer<typeof CreatePostSchema>,
  z.infer<typeof ParamsSchema>
>(
  async ({ body, params, user, request }) => {
    // Your handler logic with validated inputs
    return NextResponse.json({
      success: true,
      data: body
    });
  },
  {
    enableRateLimit: true,
    rateLimitType: 'api',
    enableCSRF: true,
    requireAuth: true,
    authValidator: validateAPIKey,
    bodySchema: CreatePostSchema,
    paramsSchema: ParamsSchema,
    sanitizeInput: true,
    corsOrigins: ['https://example.com'],
  }
);
```

### Features

- **Automatic rate limiting**
- **CSRF protection**
- **Authentication validation**
- **Request body validation (Zod)**
- **Request params validation**
- **Query params validation**
- **Input sanitization**
- **CORS handling**
- **Security headers**
- **Error handling**

### Files
- `src/lib/api-security.ts` - Comprehensive API security wrapper

## Security Logging

### Events Tracked

- Rate limit exceeded
- Invalid API key
- CSRF validation failed
- XSS attempt blocked
- SQL injection attempt
- Unauthorized access
- Suspicious requests
- Authentication failures
- Validation errors
- Malicious file uploads

### Usage

```typescript
import {
  logSecurityEvent,
  logRateLimitExceeded,
  logInvalidApiKey,
  logXSSAttempt,
} from '@/lib/security-logger';

// Log custom security event
logSecurityEvent({
  type: 'unauthorized_access',
  severity: 'high',
  message: 'User attempted to access restricted resource',
  ip: '192.168.1.1',
  userId: 'user-id',
  metadata: { resourceId: 'resource-id' },
});

// Pre-built logging functions
logRateLimitExceeded(request, identifier, limit);
logInvalidApiKey(request, apiKey);
logXSSAttempt(request, field, value);
```

### Database Schema

Security events are stored in the `security_events` table with:
- Event type and severity
- IP address and user agent
- Request path and method
- User and project IDs
- Metadata (JSON)
- Timestamp

### Admin Access

Security events are **admin-only** by default. See `ADMIN_SETUP.md` for:
- How to configure admin users
- Admin API endpoint documentation
- Frontend integration examples

**Admin Endpoint**: `GET /api/admin/security-events`

### Files
- `src/lib/security-logger.ts` - Security event logging
- `src/app/api/admin/security-events/route.ts` - Admin API endpoint
- `migrations/create_security_events_table.sql` - Database schema
- `migrations/add_security_event_stats_function.sql` - Statistics function (optional)
- `ADMIN_SETUP.md` - Admin configuration guide

## Environment Variables

Required environment variables for security features:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key

# CSRF Protection
CSRF_SECRET=your_csrf_secret_change_this_in_production

# Admin Access (optional - comma-separated user IDs)
ADMIN_USER_IDS=uuid1,uuid2,uuid3

# Security Logging (optional)
SECURITY_LOG_ENDPOINT=your_logging_endpoint_url
```

## Production Checklist

- [ ] Set strong `CSRF_SECRET` in production
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up Redis for distributed rate limiting (optional)
- [ ] Configure security event logging endpoint
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Review and adjust rate limits based on usage
- [ ] Set up monitoring for security events
- [ ] Configure backup and disaster recovery
- [ ] Regular security audits

## Migration Guide

### Running Database Migrations

```bash
# Apply security_events table
psql -U postgres -d your_database -f migrations/create_security_events_table.sql
```

Or use Supabase migrations:
```bash
supabase migration new create_security_events_table
# Copy SQL from migrations/create_security_events_table.sql
supabase db push
```

## Testing Security Measures

### Rate Limiting
```bash
# Test rate limiting
for i in {1..300}; do
  curl -X GET http://localhost:3000/api/test
done
```

### CSRF Protection
```bash
# Should fail without token
curl -X POST http://localhost:3000/api/protected \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'

# Should succeed with token
curl -X GET http://localhost:3000/api/csrf-token
curl -X POST http://localhost:3000/api/protected \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"data": "test"}'
```

### Input Validation
```bash
# Test XSS protection
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(\"XSS\")</script>"}'
```

## Support

For security issues or questions:
- Review this documentation
- Check implementation files
- Consult Next.js and Supabase security docs

## Updates

This security implementation should be regularly updated to address:
- New vulnerabilities
- Framework updates
- Best practice changes
- Performance improvements
