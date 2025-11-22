# Cron Job Orchestrator - Long-Term Solution

## Problem

SignalsLoop has **10+ background tasks** but Vercel free tier only allows **2 cron jobs**:

### Existing Tasks
1. `proactive-spec-writer` - Auto-draft specs for feedback clusters
2. `competitive-extraction` - Extract competitor mentions
3. `analyze-competitors` - Deep competitor analysis
4. `detect-feature-gaps` - Identify competitive gaps
5. `strategic-recommendations` - Generate strategic actions
6. `hunter-scan` - Scan external platforms for feedback
7. `scrape-external-reviews` - Scrape G2/Capterra/TrustRadius
8. `calls-analyze` - Process call recordings
9. `daily-backup` - Database backup to S3
10. `daily-intelligence-digest` - User analytics email

## Solution: Task Orchestrator

Instead of 10 separate cron jobs, use **1 unified orchestrator** that runs all tasks based on schedule.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│         Vercel Cron (2 slots used)                  │
├─────────────────────────────────────────────────────┤
│ 1. /api/cron/orchestrator  (every hour)            │
│    ├─ 2 AM  → Daily Backup                         │
│    ├─ 9 AM  → Morning Tasks (4 tasks)              │
│    ├─ 10 AM → Weekly Tasks (Sundays only)          │
│    └─ Every hour → Hourly Tasks (2 tasks)          │
│                                                      │
│ 2. /api/cron/daily-intelligence-digest (9 AM)      │
│    └─ User analytics email (separate, unchanged)   │
└─────────────────────────────────────────────────────┘
```

### Task Schedule

**Hourly (Every hour)**
- `hunter-scan` - Scan Reddit, Twitter, HN, etc. for feedback
- `calls-analyze` - Process pending call recordings

**Daily Morning (9 AM)**
- `proactive-spec-writer` - Auto-draft specs for feedback clusters ✨ NEW
- `competitive-extraction` - Extract competitors from feedback
- `detect-feature-gaps` - Identify competitive feature gaps
- `strategic-recommendations` - Generate strategic actions

**Daily Night (2 AM)**
- `daily-backup` - Backup database to S3

**Weekly (Sunday 10 AM)**
- `scrape-external-reviews` - Scrape G2/Capterra/TrustRadius
- `analyze-competitors` - Deep competitor analysis

---

## How It Works

### 1. Orchestrator Route
**Location:** `src/app/api/cron/orchestrator/route.ts`

The orchestrator:
- Runs every hour (configured in `vercel.json`)
- Determines which tasks to run based on current time
- Calls individual task endpoints sequentially
- Returns summary of results

### 2. Individual Task Routes
**Location:** `src/app/api/cron/{task-name}/route.ts`

Each task:
- Remains a standalone endpoint
- Can be called by orchestrator OR manually
- Requires `CRON_SECRET` authorization
- Returns `{ success, message, data }` format

### 3. Configuration
**Location:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/orchestrator",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/daily-intelligence-digest",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## Usage

### Automatic (Production)

Tasks run automatically based on schedule:
- **Every hour:** Orchestrator checks time and runs appropriate tasks
- **9 AM UTC:** Morning tasks + intelligence digest
- **2 AM UTC:** Database backup
- **Sunday 10 AM UTC:** Weekly tasks

### Manual Triggering (Development/Testing)

You can manually trigger tasks via API:

**Trigger specific schedule:**
```bash
curl -X GET "https://yourapp.com/api/cron/orchestrator?schedule=daily&time=09:00" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Trigger individual task:**
```bash
curl -X GET "https://yourapp.com/api/cron/proactive-spec-writer" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Parameters:**
- `schedule`: `hourly`, `daily`, or `weekly`
- `time`: `02:00` or `09:00` (for daily tasks)

---

## Adding New Tasks

### Step 1: Create Task Route

**Location:** `src/app/api/cron/your-new-task/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Your task logic here
    console.log('Running your task...');

    // Do work...

    return NextResponse.json({
      success: true,
      message: 'Task completed',
      data: { /* optional result data */ },
    });
  } catch (error) {
    console.error('Task failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Step 2: Register in Orchestrator

**Edit:** `src/app/api/cron/orchestrator/route.ts`

Add to appropriate schedule:

```typescript
const TASK_SCHEDULE = {
  hourly: [
    { path: '/api/cron/hunter-scan', timeout: 300000 },
    { path: '/api/cron/your-new-task', timeout: 120000 }, // ✨ NEW
  ],
  // ... other schedules
};
```

### Step 3: Test

```bash
# Test individual task
curl -X GET "http://localhost:3000/api/cron/your-new-task" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test orchestrator with your schedule
curl -X GET "http://localhost:3000/api/cron/orchestrator?schedule=hourly" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Monitoring

### Orchestrator Logs

The orchestrator logs all task executions:

```
🤖 Orchestrator: Running Daily Morning tasks (4 tasks)
  → Starting: /api/cron/proactive-spec-writer
  ✅ /api/cron/proactive-spec-writer (2341ms)
  → Starting: /api/cron/competitive-extraction
  ✅ /api/cron/competitive-extraction (1523ms)
  → Starting: /api/cron/detect-feature-gaps
  ✅ /api/cron/detect-feature-gaps (987ms)
  → Starting: /api/cron/strategic-recommendations
  ✅ /api/cron/strategic-recommendations (1102ms)
🤖 Orchestrator: Complete - 4/4 succeeded (5953ms total)
```

### Response Format

```json
{
  "success": true,
  "schedule": "Daily Morning (9 AM)",
  "summary": {
    "total": 4,
    "succeeded": 4,
    "failed": 0,
    "totalDuration": 5953
  },
  "results": [
    {
      "taskId": "proactive-spec-writer",
      "success": true,
      "duration": 2341,
      "message": "Generated 2 specs"
    },
    // ... other task results
  ]
}
```

---

## Advantages

✅ **Scalable:** Add unlimited tasks without hitting Vercel cron limit
✅ **Centralized:** All task scheduling in one place
✅ **Flexible:** Easy to change task schedules
✅ **Monitorable:** Single endpoint to monitor all tasks
✅ **Testable:** Can manually trigger any schedule
✅ **Cost-effective:** Works within Vercel free tier (uses 2/2 cron slots)
✅ **Sequential:** Tasks run one at a time (won't overwhelm system)
✅ **Timeout handling:** Each task has individual timeout configuration

---

## Migration from Old System

### Before (10 cron jobs, exceeds limit)

```json
{
  "crons": [
    { "path": "/api/cron/proactive-spec-writer", "schedule": "0 9 * * *" },
    { "path": "/api/cron/competitive-extraction", "schedule": "0 9 * * *" },
    { "path": "/api/cron/analyze-competitors", "schedule": "0 10 * * 0" },
    { "path": "/api/cron/detect-feature-gaps", "schedule": "0 9 * * *" },
    { "path": "/api/cron/strategic-recommendations", "schedule": "0 9 * * *" },
    { "path": "/api/cron/hunter-scan", "schedule": "0 * * * *" },
    { "path": "/api/cron/scrape-external-reviews", "schedule": "0 10 * * 0" },
    { "path": "/api/cron/calls-analyze", "schedule": "0 * * * *" },
    { "path": "/api/cron/daily-backup", "schedule": "0 2 * * *" },
    { "path": "/api/cron/daily-intelligence-digest", "schedule": "0 9 * * *" }
  ]
}
```
❌ **Result:** Vercel deployment fails (free tier allows only 2)

### After (2 cron jobs, within limit)

```json
{
  "crons": [
    {
      "path": "/api/cron/orchestrator",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/daily-intelligence-digest",
      "schedule": "0 9 * * *"
    }
  ]
}
```
✅ **Result:** Deploys successfully, all tasks run on schedule

---

## Task Timeout Configuration

Each task has individual timeout to prevent long-running tasks from blocking others:

| Task | Timeout | Reason |
|------|---------|--------|
| `daily-backup` | 10 min | Large database export |
| `scrape-external-reviews` | 10 min | External API rate limits |
| `proactive-spec-writer` | 5 min | GPT-4 spec generation |
| `hunter-scan` | 5 min | Multiple platform APIs |
| `analyze-competitors` | 5 min | Complex analysis |
| `competitive-extraction` | 3 min | Database queries + AI |
| `calls-analyze` | 3 min | Audio transcription |
| `detect-feature-gaps` | 2 min | Database queries |
| `strategic-recommendations` | 2 min | AI generation |

---

## Troubleshooting

### Task Not Running

1. **Check orchestrator logs:** Look for task execution in Vercel logs
2. **Check time configuration:** Ensure task is in correct schedule group
3. **Test manually:** Use curl to trigger specific schedule
4. **Verify CRON_SECRET:** Ensure environment variable is set

### Task Timeout

1. **Increase timeout:** Edit timeout value in orchestrator
2. **Optimize task:** Make task logic more efficient
3. **Split task:** Break into smaller subtasks

### All Tasks Failing

1. **Check CRON_SECRET:** Orchestrator passes auth to tasks
2. **Check individual tasks:** Test each task endpoint directly
3. **Check dependencies:** Ensure database, APIs are accessible

---

## Environment Variables

**Required:**
- `CRON_SECRET` - Authorization token for cron jobs
- `NEXT_PUBLIC_SITE_URL` - Base URL for internal API calls

**Optional:**
- `DAILY_DIGEST_EMAIL` - Email for intelligence digest (if using)

---

## Future Enhancements

**Possible improvements:**

1. **Priority queue:** High-priority tasks run first
2. **Parallel execution:** Run independent tasks concurrently
3. **Retry logic:** Automatically retry failed tasks
4. **Task dependencies:** Task B waits for Task A to complete
5. **Dynamic scheduling:** Enable/disable tasks via admin UI
6. **Monitoring dashboard:** View task history and success rates

---

## Summary

**Problem:** 10 cron jobs, Vercel allows 2
**Solution:** 1 orchestrator that runs all tasks
**Result:** Scalable, flexible, works within free tier limits

All tasks continue to work exactly as before, just orchestrated centrally! 🎉
