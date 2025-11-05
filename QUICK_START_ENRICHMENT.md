# Quick Start: User Intelligence Enrichment

Get your user intelligence system up and running in 15 minutes.

## Step 1: Run Database Migration (2 min)

```bash
# Copy the SQL and run it in Supabase SQL Editor
# OR use psql:
psql "YOUR_SUPABASE_CONNECTION_STRING" < user-intelligence-schema.sql
```

## Step 2: Set Up Slack Webhook (3 min)

1. Go to https://api.slack.com/apps
2. Create app → "From scratch"
3. Enable "Incoming Webhooks"
4. Add webhook to workspace → select channel (e.g., `#signups`)
5. Copy webhook URL

## Step 3: Get API Keys (5 min)

### Required:
- **OpenAI**: Already have? Check `.env.local` for `OPENAI_API_KEY`
- **Serper**: Go to https://serper.dev → Sign up → Get API key (50 free searches)

### Optional (but recommended):
- **GitHub**: https://github.com/settings/tokens → Generate token with `public_repo`, `read:user`

## Step 4: Add to .env.local (2 min)

```bash
# Required
OPENAI_API_KEY=sk-...
SERPER_API_KEY=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional
GITHUB_TOKEN=ghp_...
HUNTER_API_KEY=...  # For 50 free lookups/month
```

## Step 5: Test (3 min)

```bash
# Start dev server
npm run dev

# Sign up with a test account or test the API directly:
curl -X POST http://localhost:3000/api/users/enrich \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID", "runAsync": false}'
```

Check your Slack channel for the notification!

## What Happens Now?

✅ Every new signup automatically:
- Analyzes email domain for company info
- Searches GitHub for profile
- Searches web for LinkedIn, role, company
- Checks EmailRep.io for social profiles
- Synthesizes everything with AI
- Stores in `user_intelligence` table
- Sends rich Slack notification

## View Enriched Data

**Admin Dashboard (Recommended):**
1. Go to `/admin/user-intelligence` in your browser
2. View statistics, search users, sort by any column
3. Click rows to expand full details
4. Export to CSV with one click

**API endpoint:**
```bash
curl http://localhost:3000/api/admin/user-intelligence?limit=10
```

**Or in Supabase SQL Editor:**
```sql
SELECT email, company_name, role, confidence_score
FROM user_intelligence
ORDER BY created_at DESC
LIMIT 10;
```

## Cost for First 100 Signups

- OpenAI: ~$0.20
- Serper: $1.00 (after 50 free)
- GitHub: Free
- EmailRep: Free
- Slack: Free
- **Total: ~$1.20**

vs. $100-200 for Clay.com or $1,000+ for Clearbit

## Need Help?

See `USER_INTELLIGENCE_SETUP.md` for detailed documentation.
