# SignalsLoop Codebase Architecture & Patterns Guide

## 1. TECH STACK

### Framework & Runtime
- **Next.js**: 15.5.3 (App Router + Pages API hybrid)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **Node.js Runtime**: Default (nodejs for API routes)

### Database & ORM
- **Database**: PostgreSQL (via Supabase)
- **Supabase Client**: @supabase/supabase-js 2.57.4
- **Pattern**: Direct SQL queries via Supabase client (no traditional ORM)
- **Connection**: Singleton pattern with service role for server-side operations

### AI/LLM
- **OpenAI**: 5.20.3 (GPT-4o-mini, GPT-4o for various tasks)
- **Models Used**:
  - `gpt-4o-mini`: Default for categorization, sentiment analysis, smart replies
  - `gpt-4o`: Complex analysis and decision-making
- **Patterns**: Direct API integration with caching via custom `ai-cache-manager`

### Payment & Billing
- **Stripe**: 18.5.0 (payment processing)
- **Resend**: 6.1.2 (transactional email)
- **Pattern**: Webhook-based event handling for subscription lifecycle

### UI & Styling
- **Tailwind CSS**: 4.x
- **Radix UI**: Component primitives (alerts, dialogs, dropdowns, tabs, etc.)
- **Framer Motion**: 12.23.15 (animations)
- **Lucide React**: 0.544.0 (icons)
- **Recharts**: 3.2.1 (data visualization)
- **Pattern**: Composable UI components with CSS-in-JS via class-variance-authority

### External Integrations
- **Slack**: @slack/web-api 7.12.0 (webhooks and bot integration)
- **Jira**: OAuth-based integration (custom implementation)
- **Discord**: Custom integration via webhooks
- **Hunter API**: Custom implementation for feedback discovery
- **Twitter/X API**: Bearer token authentication
- **Reddit**: Public JSON API (no API key required)
- **Product Hunt**: Token-based API
- **G2**: Web scraping (cheerio-based)

### Development & Testing
- **Jest**: 30.2.0 (unit/integration tests)
- **Playwright**: 1.56.1 (E2E testing)
- **ESLint**: 9 (code linting)
- **PostCSS**: 4 (CSS processing)

### Infrastructure & Utilities
- **AWS S3**: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (backups)
- **Cloudflare R2**: Custom client wrapper for backup storage
- **PostHog**: 1.266.0 (analytics)
- **Archiver**: 7.0.1 (backup compression)
- **Date-fns**: 4.1.0 (date manipulation)
- **Zod**: 3.25.76 (schema validation)
- **CSRF Protection**: csrf-csrf 4.0.3
- **File Operations**: file-saver, xlsx 0.18.5 (export functionality)

---

## 2. DATABASE SCHEMA LOCATION & PATTERNS

### Schema Files
- **Initial Setup**: `/home/user/signalsloop/supabase-setup.sql` (core tables)
- **Migrations**: `/home/user/signalsloop/migrations/` (timestamped SQL files)
- **Inline Migrations**: Root directory `.sql` files (add-*.sql pattern)

### Core Tables Structure
```
projects → (owner_id, subscription management)
  ├── boards (project_id)
  ├── posts (project_id, board_id)
  │   ├── comments (post_id)
  │   ├── votes (post_id)
  │   └── sentiment_analysis (post_id)
  ├── members (project_id, user_id)
  ├── api_keys (project_id)
  └── stripe_settings (project_id)

Additional Tables:
- hunter_configs (feedback discovery config)
- discovered_feedback (external platform feedback)
- platform_integrations (Hunter platform setup)
- sentiment_analysis (detailed sentiment data)
- themes (theme detection results)
- user_stories (Jira export history)
- theme_clusters (grouped feedback themes)
- competitive_intelligence (competitor tracking)
- jira_connections (OAuth tokens & config)
- slack_integrations (Slack workspace config)
- billing_events (Stripe webhook events)
- discount_codes (coupon tracking)
```

### Key Patterns
- **UUIDs**: Primary keys everywhere (gen_random_uuid())
- **Timestamps**: created_at, updated_at on all user-facing tables
- **Foreign Keys**: ON DELETE CASCADE for denormalization
- **Indexes**: Strategic indexes on frequently queried columns
- **Enums**: PostgreSQL enums for status fields (platform_type, integration_status, etc.)
- **JSONB**: Flexible storage for config/metadata (platform_integrations, competitive_intelligence)
- **RLS (Row Level Security)**: Implemented but can be complex - check migrations

### Migration Pattern
Each migration:
1. Numbered by timestamp: `202511171400_feature_name.sql`
2. Uses DO blocks to safely create enums/functions
3. Includes create table/index/function statements
4. Handles existing objects with IF NOT EXISTS or exception handling

---

## 3. API ROUTE STRUCTURE & PATTERNS

### Directory Structure
```
src/app/api/
├── admin/              # Admin-only operations
├── ai/                 # AI feature endpoints (categorize, smart-replies, etc)
├── analytics/          # Analytics & event tracking
├── billing/            # Stripe integration & billing
├── boards/             # Board CRUD operations
├── calls/              # Call Intelligence Engine integration
├── comments/           # Comment management
├── competitive/        # Competitive intelligence APIs
├── cron/               # Scheduled background jobs
├── custom-domain/      # Custom domain routing
├── email-preferences/  # Subscription management
├── emails/             # Email template routes
├── embed/              # Widget embedding endpoints
├── export/             # CSV/data export
├── feedback/           # Feedback submission
├── gifts/              # Gift subscription handling
├── hunter/             # Feedback Hunter APIs
├── integrations/       # Third-party integrations (Slack, Jira, etc)
├── invitations/        # Team invitations
├── posts/              # Post CRUD and queries
├── projects/           # Project management
├── roadmap/            # Roadmap management
├── stripe/             # Stripe webhook handlers
├── themes/             # Theme detection
├── trial/              # Trial management
├── users/              # User management
├── votes/              # Voting system
└── webhooks/           # External webhook handling
```

### Route Pattern (Next.js App Router)
```typescript
// Standard pattern for all routes
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30; // Timeout in seconds

export async function GET(request: NextRequest) {
  try {
    // 1. Extract params/query
    const { projectSlug } = request.nextUrl.searchParams;
    
    // 2. Validate authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 3. Get Supabase client
    const supabase = getSupabaseServiceRoleClient();
    
    // 4. Execute business logic
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('project_slug', projectSlug);
    
    if (error) throw error;
    
    // 5. Return response
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... similar pattern
  } catch (error) {
    // ... error handling
  }
}
```

### Cron Routes Pattern
```typescript
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for long operations

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Execute job
  const result = await someBackgroundJob();
  
  return NextResponse.json({ success: true, ...result });
}
```

### Dynamic Routes (with [param])
```typescript
// src/app/api/projects/[projectSlug]/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectSlug: string } }
) {
  const { projectSlug } = params;
  // ... use projectSlug
}
```

---

## 4. EXISTING CRON JOB IMPLEMENTATIONS

### Cron Jobs Location
`/home/user/signalsloop/src/app/api/cron/`

### Implemented Cron Jobs
1. **daily-backup** (`/cron/daily-backup`)
   - Schedule: 0 2 * * * (2 AM daily)
   - Duration: 5 minutes
   - Creates full Supabase backup to Cloudflare R2
   - Cleans up backups older than 30 days

2. **hunter-scan** (`/cron/hunter-scan`)
   - Multi-platform feedback discovery
   - Scans Reddit, Twitter, Product Hunt, Hacker News, G2
   - Sentiment analysis integration

3. **competitive-extraction** (`/cron/competitive-extraction`)
   - Extracts competitor data from multiple sources
   - Analyzes competitor features vs yours

4. **calls-analyze** (`/cron/calls-analyze`)
   - Call Intelligence Engine cron job
   - Analyzes stored call transcripts
   - Extracts feature requests, objections, expansion signals

5. **detect-feature-gaps** (`/cron/detect-feature-gaps`)
   - Analyzes discovered feedback
   - Identifies missing features vs competitors

6. **scrape-external-reviews** (`/cron/scrape-external-reviews`)
   - Scrapes review sites (G2, Capterra, etc)
   - Collects customer feedback

7. **analyze-competitors** (`/cron/analyze-competitors`)
   - Strategic competitor analysis
   - Identifies market positioning

8. **strategic-recommendations** (`/cron/strategic-recommendations`)
   - Generates strategic insights from all data
   - Product development recommendations

9. **daily-intelligence-digest** (`/cron/daily-intelligence-digest`)
   - Aggregates all intelligence
   - Sends weekly/daily digest emails

### Cron Configuration
In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-backup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/hunter-scan",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Cron Authentication Pattern
- Uses `CRON_SECRET` env variable
- Vercel includes: `Authorization: Bearer {CRON_SECRET}`
- Routes verify header before execution
- No user context needed

---

## 5. UI COMPONENT STRUCTURE & PATTERNS

### Component Organization
```
src/components/
├── ui/                          # Radix UI primitive wrappers
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── ...
├── sentiment/                   # Sentiment analysis components
│   ├── SentimentBadge.tsx
│   ├── SentimentTrendChart.tsx
│   ├── SentimentWidget.tsx
│   └── __tests__/
├── board/                       # Board view components
│   ├── BoardHeader.tsx
│   ├── PostCard.tsx
│   └── mobile-board.tsx
├── AdminDashboard.tsx           # Main admin component
├── BillingDashboard.tsx
├── AIInsightsPanel.tsx
├── AIDuplicateDetection.tsx
└── ... (feature-specific components)
```

### Component Pattern (React 19 with TypeScript)
```typescript
'use client';  // Client component

import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface ComponentProps {
  projectSlug: string;
  onSubmit?: (data: any) => Promise<void>;
  children?: ReactNode;
}

export function MyComponent({ projectSlug, onSubmit, children }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit?.({});
      // Show success toast
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Loading...' : 'Submit'}
      </Button>
      {children}
    </div>
  );
}
```

### Styling Pattern
- **Tailwind CSS v4** for all styling
- **Radix UI** for accessible component primitives
- **class-variance-authority** for dynamic class management
- **clsx** for conditional classes

Example:
```typescript
import { cva } from 'class-variance-authority';
import clsx from 'clsx';

const buttonVariants = cva(
  'inline-flex items-center justify-center px-4 py-2 rounded-md',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      },
    },
    defaultVariants: { variant: 'primary' },
  }
);

export function Button({ variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonVariants({ variant })} {...props} />;
}
```

### Data Fetching Pattern
```typescript
// Server component for data fetching
async function PostList({ projectSlug }: { projectSlug: string }) {
  const supabase = getSupabaseServiceRoleClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('project_id', projectSlug);
  
  return <PostListClient posts={posts} />;
}

// Client component for interactivity
'use client';
function PostListClient({ posts }: { posts: Post[] }) {
  return <div>{posts.map(post => <PostCard key={post.id} post={post} />)}</div>;
}
```

---

## 6. AI INTEGRATION PATTERNS (OpenAI/Anthropic Usage)

### OpenAI Integration Pattern
```typescript
// Always at module level
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function that uses OpenAI
export async function categorizePost(title: string, description: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or configured model
      messages: [
        {
          role: 'system',
          content: CATEGORIZATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: CATEGORIZATION_USER_PROMPT(title, description)
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }, // For structured output
      max_tokens: 500,
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('OpenAI error:', error);
    throw error;
  }
}
```

### AI Cache Pattern
```typescript
// Centralized cache manager
import { withCache } from '@/lib/ai-cache-manager';

const categorizePost = withCache(
  categorizePostInternal,
  { ttl: 3600 } // 1 hour cache
);
```

### AI Features Implemented
1. **Categorization** (`/api/ai/categorize` & `/api/ai/categorize-v2`)
   - Classifies feedback into predefined categories
   - Uses enhanced-categorization lib with business context

2. **Smart Replies** (`/api/ai/smart-replies`)
   - Generates follow-up questions for feedback
   - Uses enhanced-smart-replies lib

3. **Priority Scoring** (`/api/ai/priority-scoring`)
   - Scores posts by business impact
   - Enhanced version with urgency levels

4. **Duplicate Detection** (`/api/ai/duplicate-detection`)
   - Finds similar/duplicate feedback
   - Helps consolidate feedback

5. **Sentiment Analysis** (`/lib/openai/sentiment.ts`)
   - Analyzes emotional tone
   - Returns sentiment category + score

6. **Writing Assistant** (`AIWritingAssistant.tsx`)
   - Improves user feedback clarity
   - Multiple modes: improve, expand, clarify, professional

7. **Auto Response** (`/api/ai/auto-response`)
   - Generates template responses to feedback

8. **Theme Detection** (`/lib/openai/themes.ts`)
   - Clusters feedback by themes
   - Identifies patterns in user requests

9. **Call Analysis** (`/lib/ai-call-analysis.ts`)
   - Analyzes call transcripts
   - Extracts feature requests, objections, expansion signals

### Rate Limiting for AI
```typescript
// Check rate limit before calling OpenAI
import { checkAILimit } from '@/lib/ai-rate-limit';

const limit = await checkAILimit(projectId, 'categorize');
if (!limit.allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfter: limit.resetAt },
    { status: 429 }
  );
}

// Make OpenAI call
```

### Prompt Configuration
```typescript
// src/config/ai-prompts.ts
// Centralized all AI prompts
export const WRITING_ASSISTANT_SYSTEM_PROMPT = (context: string, action: string) => `...`;
export const SMART_REPLIES_SYSTEM_PROMPT = `...`;
export const CATEGORIZATION_SYSTEM_PROMPT = `...`;

// Usage in components/APIs
import { WRITING_ASSISTANT_SYSTEM_PROMPT } from '@/config/ai-prompts';
```

---

## 7. AUTHENTICATION & PROJECT CONTEXT HANDLING

### Authentication Setup
- **Supabase Auth** with Google OAuth (NEXT_PUBLIC_GOOGLE_CLIENT_ID)
- **Session Persistence** via URL parameters or cookies
- **Server-side Authorization** using service role

### Getting User Context

```typescript
// In API routes
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

// Via Supabase client (server-side)
const { data: { user } } = await supabase.auth.getUser(token);

// Get user's projects
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('owner_id', user.id);
```

### Project Context Pattern
```typescript
// Utility to get project + billing info
import { resolveBillingContext } from '@/lib/billing';

const context = await resolveBillingContext(projectId, supabase);
// Returns: { project, profile, userId, subscription }

// Check plan-specific features
if (context.profile.plan !== 'pro') {
  return NextResponse.json({ error: 'Feature requires Pro plan' }, { status: 403 });
}
```

### Rate Limiting Middleware
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // Apply rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await applyRateLimit(request, 'api');
    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }
  }
  
  // Apply security headers
  return applySecurityHeaders(NextResponse.next());
}
```

### CSRF Protection
```typescript
// Generate CSRF token
const { getCSRFToken, validateCSRFToken } = require('@/lib/csrf-protection');

// In forms
const csrfToken = getCSRFToken();

// In API validation
const isValid = validateCSRFToken(request, token);
if (!isValid) {
  return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
}
```

---

## 8. SIMILAR FEATURES TO LEARN FROM

### Hunter (Feedback Discovery)
**Location**: `src/lib/integrations/hunter-sentiment-bridge.ts`, `src/app/api/hunter/*`

**Pattern**: 
- Multi-platform feedback aggregation (Reddit, Twitter, Product Hunt, Hacker News, G2)
- Sentiment analysis on discovered feedback
- Database schema with platform integrations + discovered_feedback tables
- Background cron job for periodic scanning

**Learning**: How to integrate multiple external APIs and aggregate results

### Competitive Intelligence
**Location**: `src/lib/competitive-intelligence/`, `migrations/202511161200_competitive_intelligence.sql`

**Pattern**:
- Strategic analysis using AI
- Feature gap detection
- Competitor tracking
- External review scraping
- Store results in competitive_intelligence table

**Learning**: How to implement complex multi-step AI analysis pipeline

### Jira Integration
**Location**: `src/lib/jira/`, `src/app/api/integrations/jira/*`

**Pattern**:
- OAuth 2.0 flow (3-legged OAuth)
- Encrypted token storage
- User story generation
- Batch export to Jira issues
- Connection management with database persistence

**Learning**: How to implement secure OAuth integrations

### Sentiment Analysis
**Location**: `src/lib/openai/sentiment.ts`, `migrations/202511131600_sentiment_analysis.sql`

**Pattern**:
- Sentiment categorization (positive/negative/neutral)
- Emotional tone detection
- Confidence scoring
- Trends tracking in sentiment_analysis table
- Component visualization (SentimentBadge, SentimentTrendChart)

**Learning**: How to build analytics features on top of AI analysis

### Theme Detection
**Location**: `src/lib/themes/`, `migrations/202511132140_theme_detection.sql`

**Pattern**:
- Clusters feedback items into themes
- Groups similar feature requests
- Theme-based filtering and analytics
- Nested clustering structure

**Learning**: How to aggregate and organize feedback at scale

### Billing System
**Location**: `src/lib/billing.ts`, Stripe webhook handlers

**Pattern**:
- Subscription lifecycle management
- Trial tracking
- Discount code handling
- Monthly/annual pricing
- Usage tracking via billing_events table
- Plan-based feature gating

**Learning**: How to implement SaaS billing patterns

---

## KEY PATTERNS TO FOLLOW

### 1. API Route Pattern
- Always use `runtime = 'nodejs'` and set `maxDuration`
- Validate auth in every route
- Get Supabase client from singleton
- Extract params from both URL segments and query strings
- Always wrap in try-catch with proper error responses
- Return NextResponse.json()

### 2. Database Pattern
- Use Supabase singleton (`getSupabaseServiceRoleClient()`)
- Construct queries with `.from().select().eq().single()` etc
- Handle errors explicitly
- Use migrations for schema changes
- Store configs in JSONB fields when flexible

### 3. AI Integration Pattern
- Create openai client once at module level
- Use configured model (check env or config)
- Always include system + user messages
- Use json_object response_format for structured data
- Implement caching via withCache()
- Check rate limits before expensive calls

### 4. Component Pattern
- Use 'use client' for interactive components
- Accept TypeScript Props interfaces
- Manage loading/error states
- Use Radix UI primitives + Tailwind
- Separate data fetching (server) from rendering (client)

### 5. Error Handling
- Console log all errors for debugging
- Return meaningful status codes (400, 401, 403, 404, 429, 500)
- Include error message in response
- Don't expose sensitive information

### 6. Type Safety
- Define interfaces for all request/response bodies
- Use Zod for runtime validation
- Define types in `/src/types/`
- Export types for reuse

### 7. Security
- Always validate authorization headers
- Use CSRF protection on state-changing operations
- Implement rate limiting on public endpoints
- Don't log sensitive data
- Sanitize user input (use sanitize-html)

### 8. Testing
- Unit tests: `__tests__/*.test.ts`
- Component tests: `src/components/**/__tests__/*.test.tsx`
- E2E tests: `e2e/*.spec.ts`
- Use jest for unit tests
- Use Playwright for E2E

---

## ENVIRONMENT VARIABLES

### Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE` (server-side)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET` (for scheduled jobs)

### Optional (Feature-dependent)
- `RESEND_API_KEY` (email)
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (Slack)
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `ENCRYPTION_KEY` (Jira)
- `TWITTER_BEARER_TOKEN` (Hunter - Twitter scanning)
- `PRODUCTHUNT_API_TOKEN` (Hunter - Product Hunt)

See `env.example` for full list.

---

## FILE PATHS SUMMARY

| Aspect | Location |
|--------|----------|
| Database Schema | `/home/user/signalsloop/supabase-setup.sql` |
| Database Migrations | `/home/user/signalsloop/migrations/` |
| API Routes | `/home/user/signalsloop/src/app/api/` |
| Cron Jobs | `/home/user/signalsloop/src/app/api/cron/` |
| Components | `/home/user/signalsloop/src/components/` |
| UI Primitives | `/home/user/signalsloop/src/components/ui/` |
| Utility Libs | `/home/user/signalsloop/src/lib/` |
| Type Definitions | `/home/user/signalsloop/src/types/` |
| Config Files | `/home/user/signalsloop/src/config/` |
| Tests | `/home/user/signalsloop/__tests__/` |
| E2E Tests | `/home/user/signalsloop/e2e/` |
| Environment | `env.example` |
| Build Config | `next.config.ts` |
| TypeScript | `tsconfig.json` |

