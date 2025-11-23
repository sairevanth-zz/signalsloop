# AI Roadmap Implementation Gaps - Root Cause Analysis

**Date:** 2025-11-23
**Status:** 🔴 **CRITICAL GAPS IDENTIFIED**
**Impact:** AI Roadmap Simulation showing 20% confidence and low data quality

---

## Executive Summary

The AI Roadmap simulation is correctly showing **20% confidence** because the underlying data collection systems are **not running**. The simulation logic itself is sound, but the data pipeline is completely broken.

### Root Cause: Event-Driven Agents Are Not Running

The sentiment analysis agent and other data collection agents are **NOT** running in production because:

1. ❌ **No cron job schedules the agent runner** (`/api/agents/start` is not in `vercel.json`)
2. ❌ **The agent runner only runs for 1 minute in test mode** (line 42 of `/api/agents/start/route.ts`)
3. ❌ **Events are being created but never processed** (feedback.created events sit unprocessed in the database)
4. ❌ **Feature impact history tracking is not integrated into the UI** (no way for users to record launches)

---

## The Complete Data Flow (Expected vs Actual)

### EXPECTED Flow
```
1. User creates feedback post
   ↓
2. Database trigger publishes 'feedback.created' event
   ↓
3. Sentiment Agent (listening) processes event
   ↓
4. Sentiment analysis stored in sentiment_analysis table
   ↓
5. Theme detection runs, tags post with themes
   ↓
6. AI Roadmap queries posts + sentiment data
   ↓
7. Confidence calculation uses all available data
   ↓
8. Result: 40-90% confidence (depending on data volume)
```

### ACTUAL Flow (BROKEN)
```
1. User creates feedback post
   ↓
2. Database trigger publishes 'feedback.created' event
   ↓
3. ❌ NO AGENT LISTENING - event sits in events table unprocessed
   ↓
4. ❌ No sentiment analysis happens
   ↓
5. ❌ No theme detection happens
   ↓
6. AI Roadmap queries posts (but gets no sentiment data)
   ↓
7. Confidence calculation finds: 0 historical features, <5 feedback, 0 sentiment
   ↓
8. Result: 20% confidence ← YOU ARE HERE
```

---

## Implementation Gaps - Detailed Analysis

### Gap 1: Agent Runner Not Deployed 🔴 CRITICAL

**Location:** `src/app/api/agents/start/route.ts` and `vercel.json`

**Problem:**
```typescript
// Line 42: Agent runs for only 1 minute, then stops
await new Promise(resolve => setTimeout(resolve, 60000)); // Run for 1 minute
await stopAgents(); // Then stops!
```

**Consequence:**
- Sentiment agent never processes feedback.created events
- No sentiment analysis is performed on new posts
- AI Roadmap has 0 sentiment data → confidence stays at 20%

**Evidence:**
```bash
# vercel.json crons:
"crons": [
  { "path": "/api/cron/orchestrator", "schedule": "0 2 * * *" },
  { "path": "/api/cron/send-stakeholder-reports", "schedule": "0 9 * * 1" }
]

# ❌ MISSING: /api/agents/start is NOT scheduled!
# ❌ MISSING: No background service running agents continuously
```

**Required Fix:**
1. **Option A (Serverless):** Create a cron job that processes unprocessed events from the events table every 5-15 minutes
2. **Option B (Long-running):** Deploy agents as a separate service (Docker container, Supabase Edge Function, Railway, etc.)
3. **Option C (Hybrid):** Use Supabase Database Webhooks to trigger agent processing on event insertion

---

### Gap 2: No Feature Impact History Tracking UI 🔴 CRITICAL

**Location:** Entire system - no UI implementation

**Problem:**
- The `feature_impact_history` table exists (migration `202511250000_dynamic_roadmap_intelligence.sql`)
- The API endpoint exists (`/api/roadmap/track-feature-launch`)
- But there's **NO UI** for users to:
  - Record feature launches
  - Collect post-launch metrics after 30 days
  - Add success retrospectives

**Consequence:**
- `feature_impact_history` table is empty
- AI Roadmap has 0 historical features to learn from
- Confidence can never exceed ~40% (historical features = 0% → +0% bonus)

**Required Fix:**
Create UI components:
1. `FeatureLaunchTracker.tsx` - Record when a feature ships
2. `PostLaunchMetricsCollector.tsx` - Collect metrics 30 days after launch
3. `FeatureRetrospective.tsx` - Record success rating and lessons learned
4. Add to roadmap item detail pages

---

### Gap 3: Theme Detection Not Running Automatically 🟡 HIGH

**Location:** Theme detection system

**Problem:**
- Themes are detected via `/api/detect-themes` endpoint
- But it's not clear if this runs automatically on new posts
- AI Roadmap queries posts by theme: `contains('themes', [theme.id])`
- If posts don't have themes array populated, they won't be included

**Consequence:**
- Posts without theme tags are invisible to AI Roadmap
- Artificially low feedback volume
- Lower confidence scores

**Investigation Needed:**
1. Check if theme detection agent exists and is registered
2. Verify if posts.themes array is being populated automatically
3. If not, add theme detection to the feedback.created event handler

---

### Gap 4: Event Processing is Poll-Based, Not Real-Time 🟡 HIGH

**Location:** Agent runner uses Supabase Realtime subscriptions

**Problem:**
- Current implementation: `subscribeToEvent()` uses Supabase Realtime
- Supabase Realtime has limitations:
  - Connection drops after inactivity
  - Not reliable for mission-critical event processing
  - Requires long-running connection

**Consequence:**
- If connection drops, events are never processed
- No retry mechanism
- No dead-letter queue for failed events

**Required Fix:**
- Implement polling-based event processor:
  - Queries `events` table for unprocessed events
  - Marks events as processed after handling
  - Runs every 5-15 minutes via cron
  - Has retry logic and error handling

---

### Gap 5: No Backfill Mechanism for Existing Posts 🟡 HIGH

**Location:** Entire system

**Problem:**
- Existing posts have no sentiment analysis
- Existing posts may not have theme tags
- Historical data is missing

**Consequence:**
- AI Roadmap starts with 20% confidence even if there are hundreds of posts
- No way to "catch up" on historical data

**Required Fix:**
- Create admin endpoint: `/api/admin/backfill-sentiment`
- Create admin endpoint: `/api/admin/backfill-themes`
- Create admin UI to trigger backfill operations
- Batch process existing posts to populate sentiment_analysis and themes

---

### Gap 6: Confidence Formula Doesn't Account for Real-World Scenarios 🟡 MEDIUM

**Location:** `src/lib/predictions/impact-simulation/simulator.ts:730-781`

**Problem:**
The confidence formula heavily penalizes new projects:

```typescript
let confidence = 0.2; // Base 20%

// Historical features (up to 40%)
if (similarFeatureCount >= 10) confidence += 0.4;  // Need 10 features!
else if (similarFeatureCount >= 5) confidence += 0.3;
else if (similarFeatureCount >= 3) confidence += 0.2;
else if (similarFeatureCount >= 1) confidence += 0.1;

// Current feedback (up to 30%)
if (feedbackCount >= 50) confidence += 0.3;  // Need 50 posts per theme!
else if (feedbackCount >= 20) confidence += 0.2;
else if (feedbackCount >= 10) confidence += 0.15;
else if (feedbackCount >= 5) confidence += 0.1;

// Sentiment analysis (up to 10%)
if (sentimentCount >= 30) confidence += 0.1;  // Need 30 analyzed posts!
else if (sentimentCount >= 10) confidence += 0.05;

return Math.min(0.9, confidence);
```

**Issue:**
- A new project with 10 posts, all analyzed, would still only get ~35% confidence
- The thresholds are too high for early-stage products
- Users see "low confidence" warnings even with decent data

**Required Fix:**
- Adjust thresholds to be more forgiving:
  - Historical: 1/3/5 features instead of 1/3/5/10
  - Feedback: 5/10/20 posts instead of 5/10/20/50
  - Sentiment: 5/10/20 instead of 10/30
- Add "early stage" mode that uses lower thresholds

---

## Impact on User Experience

### What the User Sees:
```
⚠️ Limited Prediction Accuracy

This prediction has low confidence (20%) and low data quality.
The system is making educated guesses based on limited feedback
data and no historical feature data.

Tip: Track feature launches in the Feature Impact History table
to enable more accurate predictions over time.
```

### What the User Thinks:
> "This is bullshit. The system is guessing randomly."

### Why They're Right:
- The system IS guessing because it has NO data to work with
- Sentiment analysis is not running
- Historical tracking is not accessible
- The warning correctly reflects the broken data pipeline

---

## Priority Fixes - Implementation Roadmap

### P0: Critical - Make Agents Work (Week 1)

**Fix 1: Implement Polling-Based Event Processor**
- Create `/api/cron/process-events` endpoint
- Queries events table for unprocessed events (add `processed` boolean column)
- Processes events in batches (10 at a time)
- Marks events as processed after successful handling
- Add retry logic with exponential backoff
- Schedule to run every 5 minutes in vercel.json

**Fix 2: Backfill Sentiment Analysis**
- Create `/api/admin/backfill-sentiment` endpoint
- Batch process all posts without sentiment analysis
- Use existing `batchAnalyzeSentiment()` function in sentiment-agent.ts
- Add progress tracking and error handling

**Fix 3: Verify Theme Detection**
- Check if posts.themes array is being populated
- If not, add theme detection to feedback.created event handler
- Backfill themes for existing posts

---

### P1: High Priority - Enable Historical Tracking (Week 2)

**Fix 4: Feature Impact History UI**

Create new components:

1. **FeatureLaunchModal.tsx**
   - Opens from roadmap item detail page
   - Form to record feature launch:
     - Feature name (pre-filled from roadmap item)
     - Category (UI/UX, API, Performance, etc.)
     - Effort estimate (small/medium/large)
     - Launch date (default: today)
   - Captures baseline metrics automatically:
     - Pre-sentiment avg (from last 7 days)
     - Pre-feedback volume (weekly avg)
     - Pre-churn rate (if available from integrations)
   - Calls `/api/roadmap/track-feature-launch` with action: "launch"

2. **FeatureImpactTracking.tsx**
   - Dashboard view showing all tracked features
   - Status column: "Launched", "Waiting for metrics", "Complete"
   - "Collect Metrics" button (enabled 30 days after launch)
   - Calls `/api/roadmap/track-feature-launch` with action: "collect-metrics"

3. **FeatureRetrospective.tsx**
   - Opens after metrics collection
   - Form to record:
     - Success rating (1-5 stars)
     - Lessons learned (text)
     - Revenue impact estimate (optional)
   - Calls `/api/roadmap/track-feature-launch` with action: "retrospective"

4. **Integration points:**
   - Add "Track Feature Launch" button to roadmap item detail pages
   - Add "Feature Impact History" tab to roadmap section
   - Show confidence improvement prediction after tracking features

---

### P2: Medium Priority - Improve Confidence Formula (Week 3)

**Fix 5: Adjust Confidence Thresholds**

Update `calculateOverallConfidence()` in simulator.ts:

```typescript
// Historical features contribution (up to 40%)
if (similarFeatureCount >= 5) confidence += 0.4;
else if (similarFeatureCount >= 3) confidence += 0.3;
else if (similarFeatureCount >= 1) confidence += 0.2;

// Current feedback contribution (up to 30%)
if (feedbackCount >= 20) confidence += 0.3;
else if (feedbackCount >= 10) confidence += 0.2;
else if (feedbackCount >= 5) confidence += 0.15;
else if (feedbackCount >= 3) confidence += 0.1;

// Sentiment analysis contribution (up to 10%)
if (sentimentCount >= 20) confidence += 0.1;
else if (sentimentCount >= 10) confidence += 0.07;
else if (sentimentCount >= 5) confidence += 0.05;

// Engagement contribution (up to 10%)
if (avgEngagement >= 10) confidence += 0.1;
else if (avgEngagement >= 5) confidence += 0.07;
else if (avgEngagement >= 2) confidence += 0.05;
```

**Fix 6: Add "Early Stage" Mode**
- Detect if project has <10 total posts
- Use even lower thresholds for early stage
- Show encouraging message: "Building confidence as you collect more data..."

---

## Testing Plan

### Test 1: Verify Event Processing Works
1. Create a new feedback post
2. Wait 5 minutes (for cron to run)
3. Check `sentiment_analysis` table - should have new record
4. Check `events` table - event should be marked as processed

### Test 2: Verify Sentiment Data Flows to AI Roadmap
1. Create feedback tagged with a theme
2. Verify sentiment analysis runs
3. Open AI Roadmap simulation for that theme
4. Should see higher confidence (30-40% instead of 20%)

### Test 3: Verify Feature Launch Tracking Works
1. Use new "Track Feature Launch" UI
2. Record a feature launch
3. Check `feature_impact_history` table - should have new record
4. After 30 days, collect metrics
5. AI Roadmap confidence should increase to 50-60%

### Test 4: Verify Backfill Works
1. Run backfill-sentiment admin endpoint
2. Check all existing posts now have sentiment_analysis records
3. AI Roadmap confidence should jump from 20% to 35-45%

---

## Success Metrics

### Before Fixes:
- ✗ Sentiment analysis: 0% of posts analyzed
- ✗ Feature impact history: 0 records
- ✗ AI Roadmap confidence: 20% (always)
- ✗ Data quality: Low (always)
- ✗ User trust: "This is bullshit"

### After Fixes:
- ✓ Sentiment analysis: 95%+ of posts analyzed within 5 minutes
- ✓ Feature impact history: Growing (1+ per feature launch)
- ✓ AI Roadmap confidence: 40-70% (depending on data volume)
- ✓ Data quality: Medium-High
- ✓ User trust: "This is actually useful!"

---

## Architecture Decision: Event Processing Strategy

### Option A: Polling-Based Processor (RECOMMENDED for Vercel)

**Pros:**
- Works within Vercel free tier (2 cron jobs, daily min frequency - but we can add more)
- Reliable - doesn't depend on long-running connections
- Retry logic built-in
- Easy to monitor and debug

**Cons:**
- Not real-time (5-15 minute delay)
- More database queries

**Implementation:**
1. Add `processed` column to events table
2. Create `/api/cron/process-events` endpoint
3. Query events WHERE processed = false ORDER BY created_at LIMIT 10
4. Process each event through agent registry
5. Mark as processed
6. Schedule to run every 5 minutes

---

### Option B: Supabase Edge Functions (Better for Real-Time)

**Pros:**
- Real-time event processing
- Long-running connections supported
- No Vercel cron limitations

**Cons:**
- Additional complexity (deploy to Supabase separately)
- Need to manage Edge Function deployment

**Implementation:**
1. Convert agent runner to Supabase Edge Function
2. Deploy to Supabase: `supabase functions deploy agent-runner`
3. Agent runner stays alive indefinitely
4. Processes events in real-time via Realtime subscriptions

---

### Recommended Approach: Hybrid

1. **Phase 1 (Immediate):** Implement polling-based processor on Vercel
2. **Phase 2 (When stable):** Migrate to Supabase Edge Functions for real-time

---

## Files to Modify

### New Files to Create:
```
src/app/api/cron/process-events/route.ts  (event processor)
src/components/roadmap/FeatureLaunchModal.tsx
src/components/roadmap/FeatureImpactTracking.tsx
src/components/roadmap/FeatureRetrospective.tsx
src/app/api/admin/backfill-sentiment/route.ts
src/app/api/admin/backfill-themes/route.ts
migrations/20251123_add_processed_to_events.sql
```

### Files to Modify:
```
vercel.json  (add process-events cron)
src/lib/predictions/impact-simulation/simulator.ts  (adjust thresholds)
src/app/[slug]/roadmap/[id]/page.tsx  (add "Track Launch" button)
```

---

## Timeline

- **Week 1 (Days 1-2):** Implement polling-based event processor + deploy
- **Week 1 (Days 3-4):** Run backfill sentiment + verify it works
- **Week 1 (Day 5):** Test and verify confidence improves to 35-45%
- **Week 2 (Days 1-3):** Build Feature Launch Tracking UI
- **Week 2 (Days 4-5):** Integration testing + user acceptance
- **Week 3:** Adjust confidence formula + monitor results

**Total time:** 2-3 weeks to fully fix

---

## Conclusion

The AI Roadmap simulation is not "bullshit" - it's **accurately reporting that the underlying data collection system is broken**. The confidence score of 20% is correct because:

1. ❌ Sentiment analysis is not running (agent not deployed)
2. ❌ Feature impact history is empty (no UI to track launches)
3. ❌ Theme detection may not be running
4. ❌ No backfill for existing data

The simulation logic itself is sound. Once we fix the data pipeline, confidence will naturally improve to 40-70% depending on data volume.

**Next Step:** Implement polling-based event processor to make agents work. This is the highest priority fix that unblocks everything else.

---

**Document Status:** ✅ Complete Analysis
**Ready for Implementation:** Yes
**Estimated Engineering Time:** 2-3 weeks (1 senior engineer)
