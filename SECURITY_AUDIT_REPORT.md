# Security Audit Report — SignalsLoop Application

**Date:** 2026-02-08
**Reviewed By:** Automated multi-agent security review (5 parallel agents)
**Scope:** Full application codebase (`/Users/revanth/signalloop`)

---

## Executive Summary

A comprehensive security audit was performed across the entire SignalsLoop Next.js application using 5 specialized review agents running in parallel:

1. **Security Sentinel** — Secrets, authentication, CSRF, session management
2. **Injection & XSS Specialist** — SQL injection, XSS, command injection, template injection
3. **API Route Security Reviewer** — Unauthenticated routes, debug endpoints, input validation, rate limiting
4. **Data Integrity & Dependency Auditor** — Vulnerable dependencies, data exposure, payment security, RLS
5. **Architecture & Configuration Reviewer** — Security headers, middleware, SSRF, webhook verification

| Severity | Count |
|----------|-------|
| CRITICAL | 12 |
| IMPORTANT | 24 |
| NICE-TO-HAVE | 7 |
| **Total** | **43** |

The application has solid security infrastructure (`secureAPI` wrapper, CSRF library, input validation, SQL safety utils) but it is only applied to a small fraction of routes. The majority of API routes lack authentication, CSRF protection, and input validation.

---

## CRITICAL Findings (Fix Immediately)

### C1. 20+ Unauthenticated Debug/Test Endpoints in Production

**Found by:** All 5 agents (unanimous)

These endpoints have **zero authentication** and expose sensitive data, use the service role key, or allow triggering actions:

| Route | File | Risk |
|-------|------|------|
| `GET /api/debug-database` | `src/app/api/debug-database/route.ts` | Uses service role key to dump users table, list auth users |
| `POST /api/debug-auth` | `src/app/api/debug-auth/route.ts` | Uses service role key, exchanges auth codes for sessions, exposes user metadata |
| `GET /api/debug-session` | `src/app/api/debug-session/route.ts` | Exposes session info |
| `GET /api/debug-supabase-config` | `src/app/api/debug-supabase-config/route.ts` | Exposes Google Client ID, Supabase config, redirect URIs |
| `GET /api/debug-oauth-flow` | `src/app/api/debug-oauth-flow/route.ts` | Exposes environment config, session data |
| `GET /api/debug-url-session` | `src/app/api/debug-url-session/route.ts` | Exposes session data, URL params, headers |
| `GET /api/debug/email-status` | `src/app/api/debug/email-status/route.ts` | Uses service role to dump user emails, billing events |
| `GET /api/admin/debug-auth` | `src/app/api/admin/debug-auth/route.ts:24` | Exposes `ADMIN_USER_IDS` env var and admin ID comparisons |
| `GET /api/test-openai` | `src/app/api/test-openai/route.ts:6` | **Leaks first 10 chars of OpenAI API key**, lists OPENAI env keys |
| `POST /api/test-email` | `src/app/api/test-email/route.ts` | Sends real emails via Resend to hardcoded address |
| `POST /api/test-welcome-email` | `src/app/api/test-welcome-email/route.ts` | Sends welcome emails to arbitrary users by ID, updates user records |
| `GET /api/test-categorization` | `src/app/api/test-categorization/route.ts:24` | Consumes OpenAI credits, **leaks stack traces** |
| `GET /api/test-callback` | `src/app/api/test-callback/route.ts` | Dumps all request headers |
| `GET /api/test-fix` | `src/app/api/test-fix/route.ts` | Queries production DB, exposes project data |
| `GET /api/test-google-flow` | `src/app/api/test-google-flow/route.ts` | Generates live OAuth URLs |
| `GET /api/test-google-oauth` | `src/app/api/test-google-oauth/route.ts` | Exposes partial Google Client ID |
| `GET /api/test-oauth` | `src/app/api/test-oauth/route.ts` | Exposes environment variable status |
| `GET /api/test-smart-replies` | `src/app/api/test-smart-replies/route.ts` | Open test endpoint |
| `GET /api/test-supabase-google` | `src/app/api/test-supabase-google/route.ts` | Exposes config details |
| `GET /api/test-simple` | `src/app/api/test-simple/route.ts` | Queries DB via service role |
| `GET /api/simple-test` | `src/app/api/simple-test/route.ts` | Reveals environment info |
| `GET /api/ultra-simple` | `src/app/api/ultra-simple/route.ts` | Test endpoint |
| `GET /api/integrations/slack/debug` | `src/app/api/integrations/slack/debug/route.ts:49-53` | **Decrypts and leaks partial Slack bot tokens** |
| `GET /api/integrations/slack/test` | `src/app/api/integrations/slack/test/route.ts` | Slack test endpoint |

**Recommended Fix:** Delete all debug and test API routes from the codebase. If needed for development, gate behind `process.env.NODE_ENV === 'development'` with an early return.

---

### C2. Middleware Excludes ALL API Routes From Authentication

**Found by:** 4 agents
**File:** `middleware.ts:128`

```typescript
matcher: [
  '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
],
```

Every `/api/*` route is excluded from middleware auth checks. Each route must handle auth individually — and most don't. The comment says "api routes (handled separately)" but the majority are NOT handled.

**Recommended Fix:** Add a separate middleware matcher for API routes that enforces authentication by default, with an explicit allowlist for public endpoints (webhooks, SDK, public feedback).

---

### C3. Stored XSS via `dangerouslySetInnerHTML` (3 instances)

**Found by:** Injection & XSS agent

| File | Line | Source | Context |
|------|------|--------|---------|
| `src/app/[slug]/board/page.tsx` | 932 | `board.custom_css` | Injected into `<style>` tag — CSS injection can exfiltrate data |
| `src/components/PublicChangelogRelease.tsx` | 183 | `release.content` | Public-facing changelog — large blast radius |
| `src/components/inbox/InboxItemDetail.tsx` | 247 | `item.contentHtml` | From external sources (Slack/Discord/email) |

**Recommended Fix:** Sanitize all content before rendering using `sanitizeHTML()` from the existing `src/lib/input-validation.ts`. For CSS, use a CSS sanitizer library to whitelist safe properties.

---

### C4. Raw SQL Execution RPC Functions (`exec_sql`, `exec`)

**Found by:** Injection & XSS agent
**File:** `src/app/api/admin/migrate-email-columns/route.ts:11,27`

```typescript
await supabase.rpc('exec_sql', { sql: `ALTER TABLE projects...` });
await supabase.rpc('exec', { sql: query });
```

The database has `exec_sql` and `exec` RPC functions that execute arbitrary SQL strings. The endpoint using them has **no authentication**. The mere existence of these functions means any compromised service key can run arbitrary SQL.

**Recommended Fix:** Remove `exec_sql` and `exec` database functions entirely. Run migrations via Supabase CLI. Add auth to this admin endpoint.

---

### C5. Mass Assignment in Bulk Update

**Found by:** Injection & XSS agent
**File:** `src/app/api/posts/bulk-update/route.ts:41-49`

```typescript
const updateData = {
  ...updates,  // Spreads arbitrary user input into DB update
  updated_at: new Date().toISOString()
};
```

Only `status` is validated. An attacker can set ANY column: `project_id`, `board_id`, `vote_count`, `ai_confidence`, `priority_score`, `owner_id`, etc.

**Recommended Fix:** Whitelist allowed update fields:
```typescript
const allowedFields = ['status', 'category', 'priority'];
const safeUpdates = Object.fromEntries(
  Object.entries(updates).filter(([k]) => allowedFields.includes(k))
);
```

---

### C6. Cron Routes: Hardcoded Fallback Secrets + Missing Auth

**Found by:** 3 agents

**Hardcoded fallback secret (`'your-cron-secret-here'`):**
- `src/app/api/cron/hunter-scan/route.ts:22`
- `src/app/api/cron/competitive-extraction/route.ts:22`
- `src/app/api/cron/strategic-recommendations/route.ts:22`
- `src/app/api/cron/detect-feature-gaps/route.ts:22`

```typescript
const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here';
```

**Conditional auth bypass (skips check if CRON_SECRET unset):**
- `src/app/api/cron/process-feedback/route.ts:34`

```typescript
if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) { // Skips if unset
```

**Zero authentication:**
- `src/app/api/cron/scrape-external-reviews/route.ts`
- `src/app/api/cron/analyze-competitors/route.ts`
- `src/app/api/cron/sync-experiments/route.ts`

**Recommended Fix:** Require `CRON_SECRET` unconditionally on all cron endpoints. No fallback values. Return 401/500 if not configured.

---

### C7. Unauthenticated Stripe Test Checkout Creates Real Products

**Found by:** API Route Security agent
**File:** `src/app/api/stripe/test-checkout/route.ts:13-58`

No auth — creates real Stripe products, prices, and checkout sessions. Attacker can pollute Stripe dashboard and generate checkout URLs.

**Recommended Fix:** Delete this endpoint.

---

### C8. Unauthenticated Admin Migration Endpoint Executes DDL SQL

**Found by:** API Route Security agent
**File:** `src/app/api/admin/migrate-email-columns/route.ts:4-11`

No auth — runs `ALTER TABLE` against production database using the service role key.

**Recommended Fix:** Delete or wrap with `secureAPI({ requireAuth: true, authValidator: validateAdminAuth })`.

---

### C9. Unauthenticated Email-Sending Endpoints (Spam Relay)

**Found by:** API Route Security agent

| File | Risk |
|------|------|
| `src/app/api/send-confirmation-email/route.ts` | Sends emails to arbitrary addresses, no auth |
| `src/app/api/emails/feedback-on-behalf/route.ts` | Sends emails to arbitrary addresses, no auth |
| `src/app/api/test-email/route.ts` | Sends test emails, no auth |
| `src/app/api/test-welcome-email/route.ts` | Sends welcome emails by user ID, no auth |

An attacker can use these as a spam relay, exhaust Resend API quotas, or get the domain blacklisted.

**Recommended Fix:** Require authentication. Add rate limiting. Validate email ownership.

---

### C10. Webhook Signature Verification Bypasses

**Found by:** Architecture & Config agent

| Webhook | File | Issue |
|---------|------|-------|
| Jira | `src/app/api/integrations/jira/webhooks/route.ts:29-84` | **No signature verification at all** |
| LaunchDarkly | `src/app/api/experiments/webhooks/launchdarkly/route.ts:24-36` | Skipped when secret env var is unset |
| Optimizely | `src/app/api/experiments/webhooks/optimizely/route.ts:24-36` | Skipped when secret env var is unset |
| Linear | `src/app/api/integrations/linear/webhooks/route.ts:58-63` | Skipped when secret env var is unset |

**Recommended Fix:** Make signature verification mandatory. Reject requests when the webhook secret is not configured.

---

### C11. Real API Keys on Disk (with backup copy)

**Found by:** Security Sentinel, Architecture agents

| File | Contents |
|------|----------|
| `.env.local` | Supabase service role key, Stripe key, OpenAI key, Resend key, Slack/Discord secrets |
| `.env.local.bak` | Identical copy of all secrets (unnecessary risk) |
| `signalsloop/.env.local` | Different Supabase project credentials (service role key) |

While `.env*` is in `.gitignore`, the `.bak` file is unnecessary duplication.

**Recommended Fix:** Delete `.env.local.bak`. Rotate all keys. Consider using a secrets manager.

---

### C12. Seed Production Protected by Hardcoded Query Param Secret

**Found by:** 2 agents
**File:** `src/app/api/admin/seed-production/route.ts:23-25`

```typescript
const secret = searchParams.get('secret');
if (secret !== 'seed-production-now') { // Trivially guessable, visible in logs
```

Uses service role key to modify production data. Query parameter secrets are logged in server logs, browser history, CDN logs.

**Recommended Fix:** Delete this endpoint or add proper admin auth via `secureAPI`.

---

## IMPORTANT Findings (Should Fix Soon)

### I1. No CSRF Protection Applied to Any Real Route

**Files:** `src/lib/api-security.ts:72`, `src/lib/csrf-protection.ts`

The CSRF infrastructure is well-implemented (Double Submit Cookie via `csrf-csrf`) but `enableCSRF` defaults to `false`. Only example routes use it. All state-changing endpoints are vulnerable to CSRF since the app uses cookie-based Supabase auth.

**Fix:** Enable `enableCSRF: true` on all state-changing API routes.

---

### I2. Widespread `.select('*')` Patterns (100+ instances)

**Files:** Throughout `src/lib/` and `src/app/api/`

Over 100 instances of `.select('*')` fetch every column including potentially sensitive data (tokens, internal IDs, metadata) which may be serialized into API responses.

**Fix:** Replace with explicit column lists selecting only needed fields.

---

### I3. No Rate Limiting on Sensitive Endpoints

**Files:** Multiple routes

| Endpoint | Risk |
|----------|------|
| `/api/stripe/checkout` | Checkout session creation flood |
| `/api/stripe/homepage-checkout` | Same |
| `/api/auth-handler` | Auth code exchange brute force |
| `/api/auth/session` | Session enumeration |
| `/api/invitations/accept` | Invitation brute force |
| `/api/admin/api-keys` | API key management |
| `/api/send-confirmation-email` | Email spam |

**Fix:** Apply rate limiting via `secureAPI` wrapper's `enableRateLimit: true`.

---

### I4. SSRF Vulnerability in Webhook URL Delivery

**Files:**
- `src/app/api/projects-by-id/[projectId]/changelog/webhooks/route.ts:42,125`
- `src/app/api/stakeholder/execute-scheduled-reports/route.ts:159`

User-provided `webhook_url` is fetched without validation against internal/private IP ranges. An attacker could target `http://169.254.169.254/latest/meta-data/` for cloud metadata.

**Fix:** Validate URLs — resolve hostname, reject private IP ranges (RFC 1918, link-local, loopback, cloud metadata).

---

### I5. XSS in Embed Iframe via Template Interpolation

**File:** `src/app/embed/[key]/frame/route.ts:153,591,668`

```typescript
<title>${project.name} - Feedback</title>
<h1>${project.name}</h1>
const CONFIG = { projectSlug: '${project.slug}' };
```

Database values interpolated into HTML template without escaping. The file already has an `escapeHtml()` function (line 943) but it's not used here.

**Fix:** Use `escapeHtml()` for all template interpolations. Use `JSON.stringify()` for JavaScript context.

---

### I6. Open Redirect via `next` Query Parameter

**File:** `src/app/auth/callback/route.ts:16,243`

```typescript
const next = searchParams.get('next') ?? '/app';
// Redirects to ${origin}${next}
```

Values like `//evil.com` or `/%0d%0aSet-Cookie:...` could cause redirect or header injection.

**Fix:** Validate `next` starts with single `/`, no `//`, matches allowed path pattern.

---

### I7. Admin Emails Exposed Client-Side

**Files:**
- `src/hooks/useAdminAuth.ts:53-56` — Hardcoded `sai.chandupatla@gmail.com`, `admin@signalsloop.com`
- `src/app/admin/layout.tsx:61-65` — Same hardcoded list
- `src/hooks/useAdminAuth.ts:48` — `NEXT_PUBLIC_ADMIN_EMAILS` bundled into client JS

**Fix:** Move admin auth to server-side only. Remove hardcoded emails. Use server-only env vars.

---

### I8. Stripe Checkout No Auth + Client-Supplied `priceId`

**File:** `src/app/api/stripe/checkout/route.ts:118,207-212,244-246`

No auth — accepts `priceId`, `successUrl`, `cancelUrl` from request body. Attacker can use arbitrary price IDs or redirect to malicious sites.

**Fix:** Require auth. Validate `priceId` against server-side allowlist. Construct redirect URLs server-side.

---

### I9. SOQL Injection in Salesforce Integration

**File:** `src/lib/crm/salesforce.ts:115,257-258`

```typescript
private escapeSoql(value: string): string {
  return value.replace(/'/g, "\\'"); // Only escapes single quotes
}
```

Vulnerable to double-encoding and other SOQL injection techniques.

**Fix:** Use Salesforce REST API parameterized queries or JSforce library's built-in methods.

---

### I10. Unsanitized `ilike`/`textSearch` Patterns

**Files:**
- `src/app/api/roadmap/suggestions/route.ts:111`
- `src/app/api/integrations/discord/events/route.ts:522,543`
- `src/app/api/cron/proactive-spec-writer/route.ts:61`
- `src/app/api/specs/route.ts:47` (textSearch)

`%` and `_` wildcards not escaped. The codebase has `buildSafeLikePattern()` in `src/lib/sql-safety.ts` but it's not used.

**Fix:** Use `buildSafeLikePattern()` for all user-controlled ILIKE parameters.

---

### I11. Unvalidated Sort Columns in `.order()` Calls

**Files:**
- `src/app/api/admin/user-intelligence/route.ts:29,36`
- `src/app/api/roadmap/suggestions/route.ts:119`

User-supplied sort field passed directly to `.order()` without validation.

**Fix:** Validate against an allowlist of column names.

---

### I12. Header Injection in Content-Disposition Filenames

**Files:**
- `src/app/api/export/feedback/route.ts:119,157`
- `src/app/api/export/[projectSlug]/route.ts:239,273`
- `src/app/api/roadmap/export/route.ts:118`
- `src/app/api/calls/export/route.ts:88`

Filenames derived from `project.name` (user-controlled) without sanitizing `"` or newline characters.

**Fix:** Sanitize filenames to `[a-zA-Z0-9._-]` or use RFC 5987 encoding.

---

### I13. 50MB Server Actions Body Size Limit

**Files:** `next.config.ts:12`, `signalsloop/next.config.ts:12`

```typescript
serverActions: { bodySizeLimit: '50mb' } // Default is 1MB
```

Enables DoS attacks via massive payloads.

**Fix:** Reduce to 2-5MB unless specific features require larger uploads.

---

### I14. TypeScript/ESLint Errors Suppressed in Builds

**Files:** `next.config.ts:4-8`, `signalsloop/next.config.ts:4-8`

```typescript
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

Type errors and lint violations (including security-related rules) silently ignored.

**Fix:** Enable both checks. Fix existing errors.

---

### I15. Missing CSP and HSTS Security Headers

**File:** `next.config.ts:15-35`

The config sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` but misses:
- `Content-Security-Policy` (CSP)
- `Strict-Transport-Security` (HSTS)
- `Permissions-Policy`

**Fix:** Add:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

### I16. CSP Allows `unsafe-inline` and `unsafe-eval` in Embed Widget

**File:** `src/app/api/embed/[key]/route.ts:489`

```
script-src 'unsafe-inline' 'unsafe-eval'; connect-src *
```

Nullifies XSS protections for the widget.

**Fix:** Use nonces or hashes. Restrict `connect-src` to specific API domains.

---

### I17. Service Role Client Used Where User-Scoped Client Should Be

**Files:**
- `src/lib/supabase-client.ts:92-102` — `getSupabaseServerClient()` returns service role singleton (misleading name)
- `src/app/api/feedback/route.ts:12-17` — Public endpoint uses service role
- `src/app/api/calls/ingest-file/route.ts:84`

Service role bypasses all RLS. Many routes use it when a user-scoped client would suffice.

**Fix:** Use `createServerClient()` (cookie-authenticated) for user routes. Reserve service role for webhooks/cron.

---

### I18. Sensitive Data in Console Logs

**Files:**
- `src/app/api/debug-auth/route.ts:34-43` — Logs user email, metadata
- `src/app/api/stripe/webhook/route.ts:66,152` — Logs email addresses
- `src/app/api/integrations/slack/events/route.ts:87` — Logs Slack channel/message details
- `src/app/embed/[key]/frame/route.ts:46` — Logs API key in plaintext

**Fix:** Remove PII from logs. Log only non-sensitive identifiers.

---

### I19. V1 API Exposes `author_email` Without Auth

**File:** `src/app/api/v1/posts/route.ts:67`

Public API returns `author_email` for all posts without authentication.

**Fix:** Remove `author_email` from select or require auth.

---

### I20. Path Traversal Risk in Backup Download

**File:** `src/app/api/admin/backups/download/route.ts:12-15`

`filename` from query string validated only with `z.string().min(1)` — no sanitization against `../`.

**Fix:** `filename: z.string().regex(/^[a-zA-Z0-9_\-\.]+$/)`

---

### I21. File Upload — No Type/Size Validation, No Auth

**File:** `src/app/api/calls/ingest-file/route.ts:64-91`

Accepts file uploads without validating MIME type, extension, or size. No user authentication.

**Fix:** Add file type validation, size limits, and require authentication.

---

### I22. Stripe Checkout Returns Mock Data on Failure

**File:** `src/app/api/stripe/checkout-session/route.ts:36-42`

Returns `{ status: 'completed', customer_email: 'test@example.com', amount_total: 1900 }` when session retrieval fails.

**Fix:** Return proper error response (404/500).

---

### I23. `disable-rls-temporarily.sql` in Repo Root

**File:** `disable-rls-temporarily.sql`

SQL script that disables RLS on 10 core tables: `projects`, `boards`, `posts`, `votes`, `comments`, `members`, `api_keys`, `stripe_settings`, `changelog_entries`, `rate_limit_violations`.

**Fix:** Delete this file. Verify RLS is enabled on all production tables. Add CI check to prevent commits containing `DISABLE ROW LEVEL SECURITY`.

---

### I24. Middleware Path Matching Bypass

**File:** `middleware.ts:59-60`

- `pathParts.length >= 3` skips protection for top-level paths like `/feedback`
- `pathname.includes(p)` is a substring match — `/public/feedback-display` matches `/feedback`

**Fix:** Use `pathname === p || pathname.startsWith(p + '/')`.

---

### I25. Unauthenticated Debug/Test Frontend Pages

**Files:**
- `src/app/debug/page.tsx`
- `src/app/debug-gifts/page.tsx`
- `src/app/debug-oauth/page.tsx`
- `src/app/auth-debug/page.tsx`
- `src/app/oauth-debug/page.tsx`
- `src/app/env-test/page.tsx`

Not listed in `protectedPaths` in middleware — publicly accessible.

**Fix:** Delete or add to `protectedPaths`.

---

### I26. Open Redirect in Slack OAuth Callback

**File:** `src/app/api/integrations/slack/callback/route.ts:120-129`

`redirect_to` from state record (originally user input) used to construct redirect URL. Protocol-relative URLs like `//evil.com` would redirect externally.

**Fix:** Validate `redirectPath` starts with `/` and does not start with `//`.

---

### I27. Multiple Unauthenticated Business API Endpoints

**Files:**
- `src/app/api/competitive-intel/scrape/route.ts` — No auth
- `src/app/api/competitive-intel/start/route.ts` — Only IP rate limiting
- `src/app/api/competitive/external/scrape/route.ts` — No user auth
- `src/app/api/competitive/external/reviews/route.ts` — No auth, service role
- `src/app/api/integrations/analytics/ingest/route.ts` — Auth optional
- `src/app/api/custom-domain/verify/route.ts` — No auth, service role
- `src/app/api/custom-domain/set/route.ts` — No auth visible
- `src/app/api/analyze-sentiment/route.ts:280` — GET returns sentiment for any projectId
- `src/app/api/ai/categorize/route.ts` — POST no auth (costs money via OpenAI)
- `src/app/api/posts/route.ts:23` — POST no auth (creates posts in any project)

**Fix:** Add authentication. Verify user has access to the requested project.

---

### I28. Notification Endpoint Auth Bypass When `INTERNAL_API_KEY` Unset

**File:** `src/app/api/notifications/send/route.ts:20-21`

```typescript
apiKey === process.env.INTERNAL_API_KEY // Passes if both are undefined
```

**Fix:** Check that `INTERNAL_API_KEY` is defined and non-empty. Use constant-time comparison.

---

## NICE-TO-HAVE Findings (Low Priority)

### N1. CSRF Token Comparison Not Using `timingSafeEqual`

**File:** `src/lib/csrf-protection.ts:109`

Simple `===` comparison vulnerable to timing attacks.

**Fix:** Use `crypto.timingSafeEqual()`.

---

### N2. Session Cookie `sameSite: 'lax'` Instead of `'strict'`

**File:** `src/lib/session-config.ts:69`

`lax` allows some CSRF vectors via top-level navigations.

**Fix:** Consider `sameSite: 'strict'` if cross-site navigational auth is not needed.

---

### N3. `document.write` in Print Export

**File:** `src/lib/launch/export-utils.ts:235`

Used for print window. If data contains unsanitized HTML, it could execute in print context.

**Fix:** Ensure data is escaped before interpolation.

---

### N4. Security Middleware Exists But Largely Unused

**Files:** `src/middleware/security.ts`, `src/lib/input-validation.ts`, `src/lib/sql-safety.ts`

Comprehensive security tooling (`withSecurity`, `secureAPIRoute`, `sanitizeObject`, `buildSafeLikePattern`) exists but only example routes use it.

**Fix:** Systematically apply security middleware to all routes.

---

### N5. Inconsistent `X-Frame-Options` Between Configs

- `next.config.ts:27` — `SAMEORIGIN`
- `vercel.json:134` — `DENY`

**Fix:** Standardize on `DENY`.

---

### N6. SDK Endpoint Wildcard CORS

**File:** `src/app/api/sdk/[projectId]/route.ts:67`

`Access-Control-Allow-Origin: '*'` — may be intentional for embeddable SDK.

**Fix:** Consider restricting to registered domains per project, or document as acceptable.

---

### N7. `health_scores` RLS Commented Out

**File:** `migrations/202512080001_health_scores.sql:41`

```sql
-- ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
```

**Fix:** Uncomment and add RLS policies.

---

## Breakage Risk Assessment

Each finding's proposed fix has been cross-referenced against the codebase to determine what would break if implemented. This helps plan retesting scope.

### Risk Summary

| Category | Count | Findings |
|----------|-------|----------|
| **SAFE** — No retesting needed | 17 | C1, C4, C7, C8, C11, C12, I7, I12, I14, I18, I20, I23, I25, N1, N3, N5, N7 |
| **LOW RISK** — Minimal retesting | 17 | C6, C9, C10, I4, I6, I9, I10, I11, I13, I15, I22, I24, I26, I28, N2, N4, N6 |
| **MEDIUM RISK** — Targeted retesting | 6 | C2, C3, C5, I1, I3, I5, I8, I17, I19, I21 |
| **HIGH RISK** — Broad retesting | 3 | I2, I16, I27 |

---

### SAFE — Deploy Without Retesting (17 findings)

| Finding | Fix Action | Why It's Safe |
|---------|------------|---------------|
| **C1** — Debug/test endpoints | Delete all `debug-*`, `test-*` routes | No production code calls them. **Exception:** Keep `/api/integrations/slack/test` — it already has auth and is used by `ChannelSelector.tsx` |
| **C4** — `exec_sql`/`exec` RPC | Remove DB functions + delete endpoint | Only called from `migrate-email-columns` (also being deleted) |
| **C7** — Stripe test checkout | Delete endpoint | Only called from `payment-test/page.tsx` (test page) |
| **C8** — Admin migration endpoint | Delete endpoint | Zero frontend references |
| **C11** — `.env.local.bak` | Delete file, rotate keys | Purely operational. After rotation, verify integrations connect |
| **C12** — Seed production endpoint | Delete endpoint | Zero frontend references |
| **I7** — Admin emails client-side | Move to server-only env var | Same logic, just server-side |
| **I12** — Header injection filenames | Sanitize to `[a-zA-Z0-9._-]` | Only affects download filename, not content |
| **I14** — TS/ESLint suppressed | Enable checks | No runtime impact (build may surface existing errors) |
| **I18** — Sensitive data in logs | Remove PII from `console.log` | Zero runtime impact |
| **I20** — Path traversal backup | Tighten filename regex | Only rejects malicious input |
| **I23** — `disable-rls-temporarily.sql` | Delete file | Not referenced by any code |
| **I25** — Debug frontend pages | Delete 6 pages | No production callers |
| **N1** — CSRF timing comparison | Use `timingSafeEqual` | Drop-in behavioral equivalent |
| **N3** — `document.write` print | Escape data | Transparent to users |
| **N5** — Inconsistent X-Frame-Options | Standardize to `DENY` | Embed widget has its own headers |
| **N7** — `health_scores` RLS | Uncomment + add policies | All access is via service role in cron |

---

### LOW RISK — Minimal Retesting (17 findings)

| Finding | Fix Action | What to Retest | Watch Out For |
|---------|------------|----------------|---------------|
| **C6** — Cron hardcoded secrets | Remove fallbacks, mandatory auth | All cron jobs | Verify `CRON_SECRET` is set in Vercel. Orchestrator already passes auth to sub-crons |
| **C9** — Email spam endpoints | Delete test endpoints, add auth | Feedback on-behalf email flow | `/api/emails/feedback-on-behalf` is called server-to-server from `/api/feedback/on-behalf` — internal call needs credentials |
| **C10** — Webhook sig bypasses | Make verification mandatory | Jira, LaunchDarkly, Optimizely, Linear webhooks | Secrets MUST be configured or events get rejected |
| **I4** — SSRF in webhooks | Validate against private IPs | Webhook delivery | Check existing webhook URL configs |
| **I6** — Open redirect `next` | Validate single `/` prefix | Login redirect, OAuth callback | Only blocks malicious values |
| **I9** — SOQL injection | Use parameterized queries | Salesforce CRM sync | Transparent change |
| **I10** — Unsanitized `ilike` | Use `buildSafeLikePattern()` | Roadmap search, Discord, specs | `%`/`_` in search get escaped |
| **I11** — Unvalidated sort columns | Allowlist valid columns | Admin user intelligence, roadmap suggestions | Ensure allowlist includes columns frontend sends |
| **I13** — 50MB body limit | Reduce to 2-5MB | File uploads via server actions | No server action currently uses large payloads |
| **I15** — Missing CSP/HSTS | Add headers | Full app smoke test | CSP misconfiguration can break the entire app — **start with report-only mode**. HSTS requires HTTPS commitment |
| **I22** — Stripe mock on failure | Return proper error | Billing page success flow | Frontend must handle error response gracefully |
| **I24** — Middleware path bypass | Fix `includes()` to `startsWith()` | Protected route access | Verify no public pages match protected path substrings |
| **I26** — Slack OAuth redirect | Validate no `//` | Slack connection flow | Only blocks malicious values |
| **I28** — Notification API key bypass | Check env var defined | Push notifications | No change if `INTERNAL_API_KEY` already set |
| **N2** — Cookie `sameSite` | — | — | **DO NOT CHANGE.** `'strict'` breaks OAuth callback and email link navigation. Keep `'lax'` |
| **N4** — Apply security middleware | Wrap routes with `secureAPI` | Each route individually | Meta-finding — do incrementally |
| **N6** — SDK wildcard CORS | — | — | **DO NOT CHANGE.** Restricting would break all customer SDK widgets |

---

### MEDIUM RISK — Targeted Retesting Required (10 findings)

#### C2. Middleware Excludes ALL API Routes
- **Breakage Risk:** MEDIUM
- **What breaks:** Missing an endpoint from the allowlist breaks it silently.
- **Must remain unauthenticated (allowlist):**
  - `/api/feedback` — public widget submission
  - `/api/posts` (POST) — public board post creation via `PostSubmissionForm.tsx`
  - `/api/ai/categorize` — called during public post submission
  - `/api/sdk/*` — customer-embedded SDK (all 4 routes)
  - `/api/embed/*` — embeddable widget
  - `/api/v1/posts` — public API
  - `/api/stripe/webhook` — Stripe webhook
  - `/api/integrations/slack/events` — Slack webhook
  - `/api/integrations/discord/events` — Discord webhook
  - `/api/integrations/jira/webhooks` — Jira webhook
  - `/api/integrations/linear/webhooks` — Linear webhook
  - `/api/experiments/webhooks/*` — LaunchDarkly, Optimizely
  - `/api/auth/callback`, `/api/auth-handler` — auth flow
  - `/api/cron/*` — Vercel cron
  - `/api/csrf-token` — needs to be accessible pre-auth
- **Retest scope:** Every API route. Full E2E of public features, webhooks, SDK, embed, OAuth, billing.

#### C3. Stored XSS via `dangerouslySetInnerHTML`
- **Breakage Risk:** MEDIUM
- **What breaks:**
  - `board.custom_css`: Users actively configure custom CSS via `BoardSettings.tsx`. Over-aggressive CSS sanitization will strip legitimate styles.
  - `release.content`: Rich-text changelog content. Sanitization must preserve bold, italic, links, lists, images, code blocks.
  - `item.contentHtml`: Slack/Discord formatting may get stripped.
- **Retest scope:** All public boards with custom CSS. Changelog display. Inbox detail view for Slack/Discord/email content.

#### C5. Mass Assignment in Bulk Update
- **Breakage Risk:** MEDIUM
- **What breaks:** `RoadmapPhaseManager.tsx` sends `status`, `phase`, `estimated_completion`, `completion_date`. If allowlist is too restrictive (only `['status', 'category', 'priority']`), roadmap phase updates break.
- **Retest scope:** Roadmap phase manager bulk update flow.

#### I1. No CSRF Protection
- **Breakage Risk:** MEDIUM (highest effort)
- **What breaks:** Enabling CSRF requires EVERY frontend component making POST/PATCH/DELETE calls to fetch and include a CSRF token. Currently **zero components** do this. Dozens need updating: `BillingDashboard`, `PostSubmissionForm`, `RoadmapPhaseManager`, `FeedbackOnBehalfModal`, `CustomDomainSettings`, `ApiKeySettings`, `BoardSettings`, `WebhooksSettings`, `VoteButton`, `IngestDialog`, `FeedbackExport`, `ExportDialog`, etc.
- **Must exclude from CSRF:** Webhooks, SDK, public widget endpoints.
- **Retest scope:** Every component that makes POST/PATCH/DELETE API calls.

#### I3. No Rate Limiting
- **Breakage Risk:** MEDIUM
- **What breaks:** Too-aggressive rate limits cause legitimate users to get 429s. Must tune limits per endpoint.
- **Retest scope:** Each rate-limited endpoint under normal and burst usage.

#### I5. XSS in Embed Iframe
- **Breakage Risk:** MEDIUM
- **What breaks:** Double-encoding risk if `project.name` has `&` or quotes. Must use `escapeHtml()` for HTML context, `JSON.stringify()` for JS context.
- **Retest scope:** Embed widget for projects with special characters in name/slug.

#### I8. Stripe Checkout No Auth
- **Breakage Risk:** MEDIUM
- **What breaks:** `priceId` allowlist must include ALL valid Stripe price IDs (monthly, yearly, premium monthly, premium yearly). `successUrl`/`cancelUrl` construction must match frontend expectations.
- **Retest scope:** Full billing upgrade flow for all plan types and billing cycles.

#### I17. Service Role Client Misuse
- **Breakage Risk:** MEDIUM
- **What breaks:** Switching to user-scoped client means RLS policies apply. If RLS policies are missing or incorrect, queries return empty results. `/api/feedback` is PUBLIC — cannot use user-scoped client there.
- **Retest scope:** Each migrated route individually.

#### I19. V1 API Exposes `author_email`
- **Breakage Risk:** MEDIUM
- **What breaks:** Removing `author_email` is a **breaking API change** for external consumers relying on this field.
- **Retest scope:** All V1 API consumers. Public roadmap/board displays showing author info.

#### I21. File Upload No Validation
- **Breakage Risk:** MEDIUM
- **What breaks:** Too-narrow file type allowlist rejects legitimate uploads. Size limit too low rejects large call recordings.
- **Retest scope:** Call recording ingest via `IngestDialog`.

---

### HIGH RISK — Significant Effort, Broad Retesting (3 findings)

#### I2. Replace `.select('*')` (281 occurrences, 178 files)
- **Breakage Risk:** HIGH
- **What breaks:** Every instance requires knowing exactly which fields downstream consumers read. A single omitted field causes **silent breakage** — undefined values, blank UI elements, JS errors. Affects virtually every page: boards, posts, settings, admin, billing, competitive intel, roadmap, inbox.
- **Approach:** Do incrementally, one module at a time. Add TypeScript types to API responses so missing fields surface at build time.
- **Retest scope:** **Entire application.**

#### I16. Embed Widget CSP (`unsafe-inline`/`unsafe-eval`)
- **Breakage Risk:** HIGH
- **What breaks:** The embed widget generates a complete inline HTML page with inline scripts, inline styles, and dynamically constructed JavaScript. Removing `unsafe-inline`/`unsafe-eval` requires **rewriting the entire embed widget** to use external script files and nonce-based CSP.
- **Retest scope:** **All embed widget deployments across all customer sites.**

#### I27. Unauthenticated Business API Endpoints
- **Breakage Risk:** HIGH
- **What breaks:** Several endpoints **must** remain unauthenticated:
  - `/api/posts` (POST) — called from `PostSubmissionForm` on **public boards**. Adding auth **breaks public feedback submission entirely**.
  - `/api/ai/categorize` — called during public post submission flow.
  - `/api/integrations/analytics/ingest` — SDK-like ingest, auth optional by design.
  - `/api/competitive-intel/*` — called from demo page (must stay unauth if demo is public).
- **Each of the 10 endpoints needs individual analysis.** Blanket auth addition breaks public-facing features.
- **Retest scope:** Public board submission, demo pages, custom domain settings, competitive intel, analytics ingest, sentiment analysis.

---

### Key Warnings

1. **Do NOT change `sameSite` to `'strict'` (N2)** — it will break OAuth callback and email link navigation.
2. **Do NOT restrict SDK wildcard CORS (N6)** — it will break all customer SDK widget deployments.
3. **Do NOT add blanket auth to `/api/posts` POST or `/api/ai/categorize`** — these serve public boards.
4. **Keep `/api/integrations/slack/test`** when deleting debug/test endpoints — it has auth and is used by `ChannelSelector.tsx`.

---

## Remediation Priority

### Phase 1 — SAFE fixes (ship immediately, no retesting needed)

All 17 SAFE findings. No functional breakage risk.

1. Delete all `debug-*` and `test-*` API routes (keep `/api/integrations/slack/test` — it has auth)
2. Delete all debug/test frontend pages (`debug/`, `debug-gifts/`, `debug-oauth/`, `auth-debug/`, `oauth-debug/`, `env-test/`)
3. Delete `.env.local.bak` and rotate all API keys
4. Remove `exec_sql` and `exec` RPC functions from database
5. Delete `disable-rls-temporarily.sql`, `seed-production` endpoint, `test-checkout` endpoint, `migrate-email-columns` endpoint
6. Remove PII from console.log statements
7. Sanitize Content-Disposition filenames
8. Tighten backup download filename regex
9. Standardize X-Frame-Options to `DENY`
10. Use `timingSafeEqual` for CSRF comparison
11. Uncomment `health_scores` RLS

### Phase 2 — LOW RISK fixes (minimal, targeted retesting)

All 17 LOW RISK findings. Each has a small, well-defined retest scope.

12. Fix all cron routes — mandatory `CRON_SECRET`, no fallbacks → **retest: all cron jobs**
13. Make webhook signature verification mandatory → **retest: Jira, LaunchDarkly, Optimizely, Linear webhooks**
14. Fix open redirect in auth callback and Slack OAuth → **retest: login flow, Slack connection**
15. Add auth to email-sending endpoints → **retest: feedback on-behalf email flow**
16. Add SSRF protections to webhook URLs → **retest: webhook delivery**
17. Use `buildSafeLikePattern()` for ILIKE searches → **retest: search features**
18. Validate sort columns → **retest: admin user intelligence, roadmap suggestions**
19. Reduce server actions body limit to 5MB → **retest: any file upload server actions**
20. Add HSTS header (safe), CSP in **report-only mode** first → **retest: full app smoke test**
21. Fix Stripe mock data on failure → **retest: billing page error handling**
22. Fix middleware path matching (`startsWith` instead of `includes`) → **retest: protected route access**
23. Fix notification API key bypass → **retest: push notifications**

### Phase 3 — MEDIUM RISK fixes (targeted retesting per feature)

10 MEDIUM RISK findings. Each fix has specific features that need retesting.

24. Fix mass assignment in `posts/bulk-update` (include `estimated_completion`, `completion_date` in allowlist) → **retest: roadmap bulk update**
25. Sanitize `dangerouslySetInnerHTML` (CSS sanitizer for `custom_css`, HTML sanitizer for changelog/inbox) → **retest: boards with custom CSS, changelog, inbox**
26. Add auth to Stripe checkout + validate `priceId` allowlist → **retest: all billing upgrade flows**
27. Fix XSS in embed iframe template interpolation → **retest: embed widget with special chars in project name**
28. Move admin auth server-side, remove hardcoded emails → **retest: admin panel login**
29. Add auth to file upload + type/size validation → **retest: call recording ingest**
30. Switch service role to user-scoped client (route by route) → **retest: each migrated route**
31. Remove `author_email` from V1 API (breaking API change — may need deprecation period) → **retest: all V1 API consumers**
32. Add rate limiting (tune limits per endpoint) → **retest: each rate-limited endpoint**
33. Enable CSRF (requires updating dozens of frontend components) → **retest: every form/button that mutates data**
34. Add API middleware with unauthenticated allowlist → **retest: every API route, full E2E**

### Phase 4 — HIGH RISK fixes (broad retesting, do last)

3 HIGH RISK findings. Significant effort and broad retesting required.

35. Replace `.select('*')` with explicit columns (281 occurrences, 178 files) → **retest: entire application** — do incrementally, one module at a time
36. Rewrite embed widget CSP (remove `unsafe-inline`/`unsafe-eval`) → **retest: all embed deployments across customer sites**
37. Individually assess 10 unauthenticated business endpoints (some MUST stay unauth for public boards/SDK) → **retest: public submission, demo, custom domains, competitive intel, analytics**

---

## Architecture Recommendation

The codebase has a well-designed `secureAPI` wrapper in `src/lib/api-security.ts` that handles:
- Authentication (user session + admin role validation)
- Rate limiting (per-IP)
- CSRF protection (Double Submit Cookie)
- Input validation (Zod schemas)
- Security headers
- Error sanitization (no stack traces in production)

**This wrapper is only used by ~5% of routes** (primarily admin backup/delete/user routes). The single highest-impact remediation would be migrating all API routes to use this wrapper, which would resolve the majority of findings in this report.

---

*Generated by multi-agent security review — 2026-02-08*
