# User Intelligence & Enrichment Setup Guide

This guide will help you set up the automated user intelligence enrichment system for SignalsLoop. When users sign up, the system automatically gathers information about them from multiple sources and sends notifications to Slack.

## Overview

The enrichment system works in 3 levels:

- **Level 1 (Free)**: Email domain analysis + GitHub API lookup
- **Level 2 (Low cost)**: Web search using Serper API + LLM extraction
- **Level 3 (Optional)**: EmailRep.io (free) + Twitter search + Hunter.io (limited free tier)

All data is synthesized using OpenAI's GPT-4o-mini with confidence scoring.

## Architecture

```
User Signup → Auth Callback → Enrichment API (async) → {
  Level 1: Email domain + GitHub
  Level 2: Web search + LLM
  Level 3: EmailRep + Twitter + Hunter

  → LLM Synthesis → Store in DB → Slack Notification
}
```

## Setup Instructions

### 1. Run Database Migration

First, create the `user_intelligence` table in your Supabase database:

```bash
# Connect to your Supabase database
psql "YOUR_SUPABASE_CONNECTION_STRING"

# Or use the Supabase SQL Editor in the dashboard
```

Then run the SQL file:

```bash
# From your project root
cat user-intelligence-schema.sql | psql "YOUR_SUPABASE_CONNECTION_STRING"
```

Or copy the contents of `user-intelligence-schema.sql` and paste it into the Supabase SQL Editor.

### 2. Set Up Environment Variables

Add the following to your `.env.local` file:

```bash
# Required - OpenAI for LLM synthesis
OPENAI_API_KEY=sk-...

# Required for Level 2 - Web search (Serper)
SERPER_API_KEY=...  # Get from https://serper.dev (50 free searches, then $50/5K)

# Optional - GitHub API for Level 1 (increases rate limits)
GITHUB_TOKEN=ghp_...  # Generate at https://github.com/settings/tokens

# Optional - Hunter.io for Level 3 (50 free/month)
HUNTER_API_KEY=...  # Get from https://hunter.io

# Required - Slack webhook for notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Required - Daily digest email
DAILY_DIGEST_EMAIL=your@email.com  # Email to receive daily user intelligence digest

# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Create a new app or select existing app
3. Navigate to "Incoming Webhooks"
4. Activate Incoming Webhooks
5. Click "Add New Webhook to Workspace"
6. Select the channel (e.g., `#signups` or `#user-intelligence`)
7. Copy the webhook URL and add to `.env.local`

### 4. Get API Keys

#### Serper API (Required for Level 2)
1. Go to https://serper.dev
2. Sign up for free account (50 free searches)
3. Copy API key from dashboard
4. For production: $50/month for 5,000 searches

#### GitHub Token (Optional but recommended)
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `public_repo`, `read:user`
4. Copy token

#### Hunter.io (Optional for Level 3)
1. Go to https://hunter.io
2. Sign up for free account (50 requests/month)
3. Get API key from dashboard
4. For production: $49/month for 1,000 requests

### 5. Test the Setup

After configuring environment variables, test the enrichment:

```bash
# Start development server
npm run dev

# In another terminal, test enrichment API
curl -X POST http://localhost:3000/api/users/enrich \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID", "runAsync": false}'
```

Or create a test signup through your app and watch the logs.

## Usage

### Automatic Enrichment

The system automatically enriches new users when they sign up. The enrichment happens in the background and doesn't block the signup flow.

### Manual Enrichment

To manually enrich an existing user:

```bash
curl -X POST https://your-domain.com/api/users/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "runAsync": true
  }'
```

### View Enrichment Data

#### Via Admin Dashboard UI (Recommended)

Navigate to `/admin/user-intelligence` in your browser to access the visual dashboard:

**Features:**
- 📊 Overview statistics (total users, enrichment success rates, avg confidence)
- 🔍 Search by email, name, company, or role
- ↕️ Sort by any column (email, company, role, confidence)
- 👁️ Click any row to expand and view full details
- 📥 Export to CSV with one click
- 🔗 Direct links to social profiles (LinkedIn, GitHub, Twitter)
- 📍 View location, bio, company size, and industry
- 🎯 Confidence scores with color coding (🟢 high, 🟡 medium, 🔴 low)

#### Via Admin API

```bash
# Get all enriched users
curl https://your-domain.com/api/admin/user-intelligence?limit=50

# With pagination
curl https://your-domain.com/api/admin/user-intelligence?limit=20&offset=20

# Sorted by confidence score
curl https://your-domain.com/api/admin/user-intelligence?sort=confidence_score&order=desc
```

#### Via Database

```sql
-- Get all enriched users with high confidence
SELECT
  ui.email,
  ui.company_name,
  ui.role,
  ui.confidence_score,
  ui.data_sources,
  u.plan
FROM user_intelligence ui
JOIN users u ON ui.user_id = u.id
WHERE ui.confidence_score > 0.7
ORDER BY ui.created_at DESC;

-- Get enrichment statistics
SELECT
  COUNT(*) as total_enriched,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE company_name IS NOT NULL) as with_company,
  COUNT(*) FILTER (WHERE github_username IS NOT NULL) as with_github,
  COUNT(*) FILTER (WHERE linkedin_url IS NOT NULL) as with_linkedin
FROM user_intelligence;
```

## Notifications

### Real-Time Slack Notifications

When a user signs up, you'll receive a Slack notification **immediately** with:

- Email, name, and plan type
- Signup timestamp

The notification is sent right after signup (before enrichment runs) to ensure you never miss a signup notification, even if enrichment fails or times out.

Once enrichment data becomes available, you can view it in the admin dashboard at `/admin/user-intelligence`.

### Daily Email Digest

Every day at 9:00 AM UTC, you'll receive an email digest with:

**Summary Statistics:**
- Total new signups in last 24 hours
- Enrichment success rate
- Average confidence score

**Plan Breakdown:**
- Number of free signups
- Number of pro signups (monthly/annual)
- Number of gift subscriptions
- Number of discount code signups

**Top Companies:**
- Up to 5 companies with most signups
- Number of signups per company

**Notable Signups:**
- High-confidence enrichments (>70%)
- Pro plan signups
- Users from interesting companies
- Users with complete profiles (company + role)

**Direct Link:**
- One-click access to full admin dashboard

The email is beautifully formatted with color-coded confidence scores and plan emojis. If there are no signups in 24 hours, you'll still receive a brief summary email.

**Customize the schedule:** Edit `vercel.json` to change when the digest is sent (currently daily at 9 AM UTC)

## Cost Estimate

For first 100 signups:

| Service | Free Tier | Cost for 100 Users | Notes |
|---------|-----------|-------------------|-------|
| OpenAI GPT-4o-mini | $5 credit | ~$0.20 | Very cheap model |
| Serper (web search) | 50 free | $1.00 ($0.01 per search) | Level 2 |
| GitHub API | Unlimited | $0 | With token: 5K/hour |
| EmailRep.io | Unlimited | $0 | No auth required |
| Hunter.io | 50 free | $0 (then $0.05/lookup) | Level 3 |
| Slack | Unlimited | $0 | Webhooks are free |
| **Total** | | **~$1.20 for 100 users** | After free tiers |

Monthly cost at scale (1,000 signups/month): **~$15-20**

Compare to ready-made solutions:
- Clearbit: $1,000-2,000/month
- Clay.com: $150/month for 1,000 enrichments
- Hunter.io only: $149/month

## Customization

### Add More Data Sources

Edit `src/lib/enrichment.ts` and add new functions:

```typescript
export async function fetchCustomSource(email: string) {
  // Your custom logic
  return data;
}

// Add to enrichUser() function
const customData = await fetchCustomSource(input.email);
```

### Modify Slack Message Format

Edit `src/lib/slack-notifications.ts` and update the `formatSlackBlocks()` function.

### Adjust Confidence Scoring

The LLM automatically calculates confidence scores, but you can add custom logic in `synthesizeWithLLM()` in `src/lib/enrichment.ts`.

### Change Enrichment Trigger

Currently enriches all new signups. To change this, edit `src/app/auth/callback/route.ts`:

```typescript
// Only enrich pro users
if (isNewUser && userRecord.plan !== 'free') {
  // trigger enrichment
}

// Only enrich company emails
const emailDomain = email.split('@')[1];
if (!personalDomains.includes(emailDomain)) {
  // trigger enrichment
}
```

## Troubleshooting

### No enrichment happening

1. Check logs: `npm run dev` and watch for `[Enrichment]` logs
2. Verify env variables are set: `console.log(process.env.OPENAI_API_KEY)`
3. Check database table exists: `SELECT * FROM user_intelligence LIMIT 1;`

### Low confidence scores

- Not enough data sources configured
- Personal email addresses (Gmail, Yahoo) have less data
- User has minimal online presence
- Add more API keys (GitHub, Hunter) to improve coverage

### Slack notifications not sending

**Common cause**: Missing `SLACK_WEBHOOK_URL` environment variable

1. Check if webhook URL is set:
   ```bash
   # Local development
   grep SLACK_WEBHOOK_URL .env.local

   # Production (Vercel)
   vercel env ls | grep SLACK
   ```

2. Test webhook manually:
   ```bash
   curl -X POST $SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text":"Test notification"}'
   ```

3. Check webhook URL format (should start with `https://hooks.slack.com/services/`)
4. Verify Slack app has permission to post to channel
5. Check logs for `[SLACK]` messages

**Note**: As of the latest update, Slack notifications are sent **immediately** when a user signs up (from the auth callback), rather than waiting for enrichment to complete. This ensures you never miss a signup notification even if enrichment fails.

### API rate limits

- GitHub: Use token for 5K requests/hour vs 60/hour
- Serper: Upgrade plan for more searches
- Hunter: Free tier is 50/month, upgrade for more

## Production Recommendations

1. **Monitor costs**: Set up billing alerts in OpenAI and Serper
2. **Cache results**: Don't re-enrich same email domain multiple times
3. **Queue system**: Use a job queue (BullMQ, Inngest) for better reliability
4. **Error handling**: Add retry logic for failed API calls
5. **Rate limiting**: Add rate limits to enrichment API to prevent abuse
6. **Analytics**: Track enrichment success rate, confidence scores over time

## Future Enhancements

- Add Clearbit/Proxycurl for LinkedIn data (if budget allows)
- Implement retry mechanism for failed enrichments
- Add webhook endpoint for real-time enrichment requests
- Create dashboard UI for viewing enriched data
- Export enriched data to CSV
- Integrate with CRM (HubSpot, Salesforce)
- Add email validation/verification
- Implement company size detection from employee count APIs

## Support

For issues or questions:
- Check logs in development console
- Review Supabase dashboard for database errors
- Test individual API endpoints
- Verify all environment variables are set correctly
