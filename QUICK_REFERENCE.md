# SignalsLoop Quick Reference Guide

## Common File Locations

### Adding a New API Route
1. Create: `src/app/api/[feature]/[action]/route.ts`
2. Pattern:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServiceRoleClient();
    
    // Implementation
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Adding AI Features
1. Create handler in: `src/lib/ai-*.ts`
2. Create API route: `src/app/api/ai/[feature]/route.ts`
3. Configure prompt in: `src/config/ai-prompts.ts`
4. Implement caching if needed: `withCache(function, options)`

### Adding Database Schema
1. Create migration: `migrations/YYYYMMDDHHMI_description.sql`
2. Use DO blocks for enums/functions:
```sql
DO $$ BEGIN
  CREATE TYPE my_enum AS ENUM ('option1', 'option2');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```
3. Create table with proper indexes

### Adding UI Component
1. Create: `src/components/MyComponent.tsx`
2. Wrap with `'use client'` if interactive
3. Use Radix UI + Tailwind CSS
4. Define TypeScript interface for props
5. Add tests: `src/components/__tests__/MyComponent.test.tsx`

### Adding Cron Job
1. Create: `src/app/api/cron/[job-name]/route.ts`
2. Verify CRON_SECRET in route
3. Add to `vercel.json` crons array
4. Keep runtime=nodejs, maxDuration appropriate for task

## Common Tasks

### Query Database
```typescript
const supabase = getSupabaseServiceRoleClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value')
  .limit(10);
```

### Call OpenAI
```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: userInput }
  ],
  response_format: { type: 'json_object' }
});
```

### Check User Plan
```typescript
import { resolveBillingContext } from '@/lib/billing';

const context = await resolveBillingContext(projectId, supabase);
if (context.profile.plan !== 'pro') {
  return NextResponse.json({ error: 'Requires Pro' }, { status: 403 });
}
```

### Rate Limiting
```typescript
import { checkAILimit } from '@/lib/ai-rate-limit';

const limit = await checkAILimit(projectId, 'feature_name');
if (!limit.allowed) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

### Send Email
```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Title',
  body: htmlBody
});
```

## Key Environment Variables

- `OPENAI_API_KEY` - Required for AI features
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE` - Server-side database access
- `STRIPE_SECRET_KEY` - Payment processing
- `CRON_SECRET` - Cron job authentication
- `TWITTER_BEARER_TOKEN` - Twitter/X API (Hunter feature)

## Testing

### Run Tests
```bash
npm test                    # All tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E
npm run test:e2e:headed   # E2E with browser visible
```

### Write Unit Test
```typescript
describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

## Database Migration Checklist

- [ ] Numbered with timestamp (YYYYMMDDHHMI)
- [ ] Safe enum/function creation (DO blocks with exception handling)
- [ ] Indexes on frequently queried columns
- [ ] Foreign keys with ON DELETE CASCADE where appropriate
- [ ] created_at and updated_at timestamps
- [ ] Descriptive comments
- [ ] Tested locally before deployment

## Code Review Checklist

- [ ] Error handling with meaningful messages
- [ ] Input validation (Zod or manual)
- [ ] Authorization checks
- [ ] Rate limiting where applicable
- [ ] TypeScript types defined
- [ ] Logging for debugging
- [ ] No sensitive data exposure
- [ ] Tests added
- [ ] Documentation updated

## Deployment Checklist

- [ ] All env vars set in Vercel
- [ ] Database migrations applied
- [ ] Tests passing
- [ ] No console.error warnings
- [ ] Rate limiting configured
- [ ] CORS headers correct
- [ ] Cron jobs configured
- [ ] Stripe webhooks verified

