# Cron Job Orchestrator - Vercel Pro Tier

## Overview

SignalsLoop uses **Vercel Pro tier** for background job scheduling. This provides:
- ✅ **10 cron jobs** per project (vs 2 on Hobby tier)
- ✅ **Every minute scheduling** (vs daily minimum on Hobby)
- ✅ **60s function timeout** for standard functions
- ✅ **300s timeout** for cron job functions

## Current Cron Jobs (10/10 slots used)

| Cron Job | Schedule | Frequency | Purpose |
|----------|----------|-----------|---------|
| `process-events` | `*/5 * * * *` | Every 5 min | Real-time agent event processing |
| `orchestrator (morning)` | `0 9 * * *` | Daily 9 AM | Batch intelligence tasks |
| `orchestrator (evening)` | `0 21 * * *` | Daily 9 PM | Batch maintenance tasks |
| `generate-suggestions` | `0 */6 * * *` | Every 6 hours | AI proactive suggestions |
| `scheduled-queries` | `0 */4 * * *` | Every 4 hours | Execute user scheduled queries |
| `daily-intelligence-digest` | `0 8 * * *` | Daily 8 AM | Email intelligence digest |
| `outcome-metrics` | `0 */12 * * *` | Every 12 hours | Update outcome attribution |
| `hunter-scan` | `0 */8 * * *` | Every 8 hours | Scan external platforms |
| `send-stakeholder-reports` | `0 9 * * 1` | Weekly Monday 9 AM | Stakeholder email reports |
| `outcome-classify` | `0 3 * * *` | Daily 3 AM | Classify feature outcomes |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Vercel Pro Cron Jobs (10 slots)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  HIGH FREQUENCY (Real-time processing)                               │
│  ├── process-events        → Every 5 min (agent reactions)          │
│  ├── scheduled-queries     → Every 4 hours                          │
│  ├── generate-suggestions  → Every 6 hours                          │
│  └── hunter-scan           → Every 8 hours                          │
│                                                                      │
│  DAILY TASKS (Intelligence & Maintenance)                            │
│  ├── daily-intelligence-digest → 8 AM (email reports)               │
│  ├── orchestrator (morning)    → 9 AM (batch tasks)                 │
│  ├── orchestrator (evening)    → 9 PM (backup/cleanup)              │
│  ├── outcome-classify          → 3 AM (feature outcomes)            │
│  └── outcome-metrics           → Every 12 hours                     │
│                                                                      │
│  WEEKLY TASKS                                                        │
│  └── send-stakeholder-reports  → Monday 9 AM                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Orchestrator Batches

The orchestrator handles batch tasks that benefit from sequential execution:

### Morning Batch (9 AM Daily)
- `dynamic-roadmap` - Auto-adjust roadmap priorities
- `proactive-spec-writer` - Auto-draft specs for feedback clusters
- `competitive-extraction` - Extract competitor mentions
- `detect-feature-gaps` - Identify competitive gaps
- `strategic-recommendations` - Generate strategic actions
- `calls-analyze` - Process call recordings
- `sync-experiments` - Sync experiment results
- `sync-customers` - Sync CRM customer data

### Evening Batch (9 PM Daily)
- `daily-backup` - Database backup

### Weekly Batch (Sunday 9 AM, added to morning)
- `scrape-external-reviews` - Scrape G2/Capterra/TrustRadius
- `analyze-competitors` - Deep competitor analysis
- `collect-feature-metrics` - Post-launch feature metrics

## Configuration

**Location:** `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/process-events", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/orchestrator?schedule=morning", "schedule": "0 9 * * *" },
    { "path": "/api/cron/orchestrator?schedule=evening", "schedule": "0 21 * * *" },
    { "path": "/api/cron/generate-suggestions", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/scheduled-queries", "schedule": "0 */4 * * *" },
    { "path": "/api/cron/daily-intelligence-digest", "schedule": "0 8 * * *" },
    { "path": "/api/cron/outcome-metrics", "schedule": "0 */12 * * *" },
    { "path": "/api/cron/hunter-scan", "schedule": "0 */8 * * *" },
    { "path": "/api/cron/send-stakeholder-reports", "schedule": "0 9 * * 1" },
    { "path": "/api/cron/outcome-classify", "schedule": "0 3 * * *" }
  ],
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 60, "memory": 1024 },
    "app/api/cron/**/*.ts": { "maxDuration": 300, "memory": 1024 }
  }
}
```

## Function Timeouts

| Function Type | Max Duration | Memory |
|---------------|--------------|--------|
| Standard API routes | 60 seconds | 1024 MB |
| Cron job routes | 300 seconds | 1024 MB |
| AI-heavy routes | 60 seconds | 1024 MB |

## Manual Triggering

**Trigger morning batch:**
```bash
curl -X GET "https://signalsloop.com/api/cron/orchestrator?schedule=morning" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Trigger evening batch:**
```bash
curl -X GET "https://signalsloop.com/api/cron/orchestrator?schedule=evening" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Trigger individual task:**
```bash
curl -X GET "https://signalsloop.com/api/cron/process-events" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Adding New Cron Jobs

### Option 1: Add as Independent Cron (if slots available)

1. Add to `vercel.json`:
```json
{ "path": "/api/cron/your-task", "schedule": "0 * * * *" }
```

2. Create route at `src/app/api/cron/your-task/route.ts`

### Option 2: Add to Orchestrator Batch

1. Edit `src/app/api/cron/orchestrator/route.ts`
2. Add to appropriate batch in `TASK_SCHEDULE`

## Monitoring

### Vercel Dashboard
- Go to Project → Logs → Filter by "cron"
- View execution times, success/failure rates

### Orchestrator Response
```json
{
  "success": true,
  "schedule": "Morning Batch (9 AM)",
  "summary": {
    "total": 8,
    "succeeded": 8,
    "failed": 0,
    "totalDuration": 45230
  },
  "results": [
    { "taskId": "dynamic-roadmap", "success": true, "duration": 5432 },
    // ...
  ]
}
```

## Environment Variables

**Required:**
- `CRON_SECRET` - Authorization token for cron jobs
- `NEXT_PUBLIC_SITE_URL` - Base URL for internal API calls

## Vercel Pro vs Hobby Comparison

| Feature | Hobby (Free) | Pro |
|---------|-------------|-----|
| Cron jobs | 2 max | 10 max |
| Min schedule | Daily | Every minute |
| Function timeout | 10s | 60s (300s for cron) |
| Memory | 1024 MB | 3008 MB |

## Migration from Hobby to Pro

**Before (Hobby - 2 cron jobs):**
- All tasks bundled into single orchestrator
- Tasks ran twice daily (9 AM, 9 PM)
- Trade-off: Slower event processing (~12 hour delay)

**After (Pro - 10 cron jobs):**
- Critical tasks run independently
- `process-events` runs every 5 minutes (near real-time)
- Better reliability - one failing cron doesn't block others
- More granular scheduling options

---

## Summary

With Vercel Pro, SignalsLoop now has:
- ✅ Near real-time event processing (every 5 min vs 12 hours)
- ✅ Independent cron jobs for critical tasks
- ✅ 60s function timeouts (vs 10s on Hobby)
- ✅ Better scheduling flexibility
- ✅ All 10 cron slots utilized for optimal performance
