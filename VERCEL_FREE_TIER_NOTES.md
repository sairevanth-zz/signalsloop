# Vercel Free Tier Compatibility Notes

## Current Status: ✅ Free Tier Compliant

All configurations have been updated to stay within Vercel's Hobby (Free) tier limits.

---

## Vercel Free Tier Limits

### Serverless Functions
- **Max Duration:** 10 seconds
- **Memory:** 1024 MB
- **Deployments:** 100/day
- **Build Minutes:** 6000/month

### Cron Jobs
- **Max Cron Jobs:** 2 cron jobs (Hobby tier)
- **Frequency:** Any cron schedule
- **Duration:** Subject to same 10s function limit

### Current Usage
- ✅ **Cron Jobs:** 2/2 used (morning & evening orchestrators)
- ✅ **Function Duration:** 10 seconds (compliant)
- ✅ **Memory:** 1024 MB (compliant)

---

## Scheduled Reports Feature

### Important Note
**The scheduled reports cron job is NOT enabled by default** because:
1. Free tier only allows 2 cron jobs (already used)
2. To add scheduled reports, you need to:
   - Remove an existing cron job, OR
   - Upgrade to Vercel Pro ($20/month)

### Option 1: Replace Existing Cron Job (Free)

If you want scheduled reports instead of one of the existing crons, edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/orchestrator?schedule=morning",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/stakeholder/execute-scheduled-reports",
      "schedule": "0 * * * *"
    }
  ]
}
```

This replaces the evening orchestrator with hourly scheduled reports.

### Option 2: Use External Cron Service (Free)

Use a free external cron service instead of Vercel Cron:

**GitHub Actions** (Recommended - Free):
1. Create `.github/workflows/scheduled-reports.yml`:

```yaml
name: Execute Scheduled Reports
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - name: Execute Reports
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.vercel.app/api/stakeholder/execute-scheduled-reports
```

2. Add `CRON_SECRET` to GitHub Secrets

**Other Free Options:**
- **cron-job.org** - Free, web-based cron service
- **EasyCron** - Free tier with 1-hour minimum interval
- **Cronitor** - Free tier for monitoring

### Option 3: Upgrade to Vercel Pro ($20/month)

Vercel Pro benefits:
- ✅ Unlimited cron jobs
- ✅ 60-second function duration (vs 10s)
- ✅ 6TB bandwidth (vs 100GB)
- ✅ Team collaboration features
- ✅ Advanced analytics

Then you can add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/orchestrator?schedule=morning",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/orchestrator?schedule=evening",
      "schedule": "0 21 * * *"
    },
    {
      "path": "/api/stakeholder/execute-scheduled-reports",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 10-Second Function Limit Considerations

### What Works in 10 Seconds
Most stakeholder queries should complete in 10 seconds:
- Simple queries: 1-3 seconds
- Complex queries with multiple components: 5-8 seconds
- Average query time: 3-5 seconds

### What Might Time Out
- Very complex queries with 5+ components
- Large datasets (>1000 posts)
- Multiple scheduled reports at once

### Optimization Tips
1. **Limit concurrent reports** - Process 1-2 reports per cron run
2. **Simplify queries** - Shorter queries run faster
3. **Use caching** - Already implemented, helps significantly
4. **Stagger schedules** - Run reports at different times

### If You Need More Time
Upgrade to Pro for 60-second function duration:
```typescript
export const maxDuration = 60; // Requires Vercel Pro
```

---

## Configuration Files

### Current Config (Free Tier)

**vercel.json:**
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10,  // Free tier compliant
      "memory": 1024
    }
  }
}
```

**execute-scheduled-reports/route.ts:**
```typescript
export const maxDuration = 10; // Free tier compliant
```

### Pro Tier Config (If Upgraded)

Update both files to:
```typescript
export const maxDuration = 60;
```

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60,  // Pro tier
      "memory": 1024
    }
  }
}
```

---

## Testing Scheduled Reports Without Cron

You can manually trigger the endpoint:

```bash
# Set environment variable
export CRON_SECRET="your-secret-key"

# Test locally
curl -X POST http://localhost:3000/api/stakeholder/execute-scheduled-reports \
  -H "Authorization: Bearer $CRON_SECRET"

# Test on Vercel
curl -X POST https://your-app.vercel.app/api/stakeholder/execute-scheduled-reports \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Environment Variables Required

Add to your Vercel environment variables:

```bash
# Required for scheduled reports
CRON_SECRET=your-random-secret-key-here

# Required for email delivery (optional)
RESEND_API_KEY=re_xxxxx

# Required for cron execution (optional)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Monitoring & Debugging

### Check Cron Execution
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" → Select deployment
3. Click "Functions" → Find your cron function
4. View logs to see execution history

### Common Issues

**Issue: Cron not running**
- Check: Is it added to `vercel.json`?
- Check: Is `CRON_SECRET` set in environment variables?
- Check: Free tier only allows 2 cron jobs

**Issue: Function timeout (10s limit)**
- Solution: Reduce query complexity
- Solution: Process fewer reports per run
- Solution: Upgrade to Pro for 60s limit

**Issue: Unauthorized errors**
- Check: `CRON_SECRET` matches in env and code
- Check: Authorization header format: `Bearer YOUR_SECRET`

---

## Recommendations

### For Free Tier Users
1. ✅ Keep current setup (no scheduled reports cron)
2. ✅ Use manual triggers or GitHub Actions for scheduled reports
3. ✅ Optimize queries to stay under 10s

### For Pro Tier Users
1. ✅ Add scheduled reports to vercel.json
2. ✅ Increase maxDuration to 60 seconds
3. ✅ Enable unlimited cron jobs
4. ✅ Monitor execution in Vercel dashboard

---

## Summary

| Feature | Free Tier | Pro Tier ($20/mo) |
|---------|-----------|-------------------|
| Max Cron Jobs | 2 | Unlimited |
| Function Duration | 10s | 60s |
| Scheduled Reports | Manual/External | Fully Automated |
| Recommended For | Small projects | Production apps |

**Current Setup:** ✅ Free tier compliant, no changes needed for deployment.

**To Enable Scheduled Reports:** Choose Option 1, 2, or 3 above based on your needs.
