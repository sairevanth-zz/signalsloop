# Option B: Event-Driven Foundation - Implementation Plan

## Executive Summary

Transform SignalsLoop from **AI-automated** (reactive, HTTP-based) to **AI-native** (proactive, event-driven) by implementing a proper event-driven architecture where autonomous agents work 24/7 responding to events.

---

## Current State vs Target State

### Current Architecture (AI-Automated)
```
User creates feedback → HTTP API call → AI processes → HTTP response
Cron job runs → Fetches data → Processes → Saves → Done
```
**Problems:**
- Tight coupling between components
- No real-time reactivity
- Agents run on schedules, not on events
- Sequential processing (slow)
- Manual triggers required for many operations

### Target Architecture (AI-Native)
```
Event occurs → Published to event bus → Multiple agents react autonomously
Feedback created → [Event: feedback.created] →
  → Sentiment Agent (analyzes)
  → Theme Agent (categorizes)
  → Duplicate Agent (checks)
  → Spec Writer Agent (evaluates if spec needed)
  → Notification Agent (alerts team)
```
**Benefits:**
- Loose coupling via events
- True real-time reactivity
- Agents work autonomously 24/7
- Parallel processing (fast)
- Zero manual intervention

---

## Technology Stack Selection

### Event Bus Options

| Technology | Pros | Cons | Verdict |
|------------|------|------|---------|
| **Kafka/RabbitMQ** | Industry standard, robust | Complex setup, hosting costs, overkill | ❌ Too heavy |
| **Redis Streams** | Fast, simple | Need Redis hosting, state management | ❌ Extra infra |
| **Supabase Realtime** | Already have it, free, PostgreSQL-based | Limited throughput | ✅ **RECOMMENDED** |
| **Inngest** | Serverless, free tier, built for this | External dependency | ✅ **BACKUP OPTION** |

**Decision: Use Supabase Realtime + Database Triggers**
- Already integrated (no new costs)
- PostgreSQL triggers = native event publishing
- Realtime subscriptions = event consumption
- Proven to work (we already use it for dashboard)

### Agent Orchestration

| Approach | Description | Verdict |
|----------|-------------|---------|
| **Long-running workers** | Node.js processes listening to events | ❌ Doesn't work on Vercel |
| **Serverless functions** | Edge functions triggered by events | ✅ **RECOMMENDED** |
| **Inngest** | Managed event-driven background jobs | ✅ **ALTERNATIVE** |

**Decision: Supabase Edge Functions + Database Triggers**
- Trigger when events occur in database
- Call Edge Functions to process
- Automatic retry on failure
- No additional infrastructure

---

## Event-Driven Architecture Design

### 1. Event Schema

Every event follows this structure:
```typescript
interface DomainEvent {
  id: string;                    // Unique event ID
  type: string;                  // Event type (e.g., 'feedback.created')
  aggregate_type: string;        // Entity type (e.g., 'post', 'spec')
  aggregate_id: string;          // Entity ID
  payload: Record<string, any>;  // Event data
  metadata: {
    user_id?: string;
    project_id: string;
    timestamp: string;
    correlation_id?: string;     // For tracing event chains
  };
  version: number;               // Event schema version
}
```

### 2. Core Events

**Feedback Domain:**
- `feedback.created` - New feedback submitted
- `feedback.updated` - Feedback edited
- `feedback.voted` - Upvote/downvote
- `feedback.commented` - New comment added

**AI Analysis Domain:**
- `sentiment.analyzed` - Sentiment score computed
- `theme.detected` - Theme identified/updated
- `duplicate.found` - Duplicate feedback detected
- `priority.calculated` - Priority score updated

**Spec Domain:**
- `spec.auto_drafted` - AI generated spec draft
- `spec.approved` - PM approved spec
- `spec.linked` - Spec linked to feedback

**Competitive Domain:**
- `competitor.mentioned` - Competitor found in feedback
- `competitor.feature_detected` - Competitor feature identified

### 3. Event Flow Examples

**Example 1: Feedback Created**
```
1. User submits feedback
   ↓
2. API creates post in DB
   ↓
3. Database trigger publishes: feedback.created
   ↓
4. Autonomous agents react in parallel:
   - Sentiment Agent → analyzes → publishes: sentiment.analyzed
   - Theme Agent → categorizes → publishes: theme.detected
   - Duplicate Agent → checks → publishes: duplicate.found (if applicable)
   - Notification Agent → alerts team on Slack
   ↓
5. Sentiment analysis complete
   ↓
6. Database trigger publishes: sentiment.analyzed
   ↓
7. Spec Writer Agent reacts:
   - Checks if theme has 20+ feedback
   - Auto-drafts spec → publishes: spec.auto_drafted
   ↓
8. Notification Agent reacts to spec.auto_drafted:
   - Alerts PM to review new spec
```

**Example 2: High-Volume Theme Detected**
```
1. Theme Agent processes feedback.created
   ↓
2. Updates theme frequency (now 20 items)
   ↓
3. Database trigger publishes: theme.threshold_reached
   ↓
4. Spec Writer Agent reacts:
   - Fetches all 20 feedback items
   - Generates comprehensive spec
   - Publishes: spec.auto_drafted
   ↓
5. PM receives notification to review
```

---

## Implementation Phases

### Phase 1: Event Infrastructure (Week 1)
**Goal:** Set up event publishing and consumption infrastructure

**Tasks:**
1. Create `events` table in PostgreSQL
   ```sql
   CREATE TABLE events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     type TEXT NOT NULL,
     aggregate_type TEXT NOT NULL,
     aggregate_id UUID NOT NULL,
     payload JSONB NOT NULL,
     metadata JSONB NOT NULL,
     version INTEGER DEFAULT 1,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX idx_events_type ON events(type);
   CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id);
   CREATE INDEX idx_events_created_at ON events(created_at DESC);
   ```

2. Create event publishing utility
   ```typescript
   // src/lib/events/publisher.ts
   export async function publishEvent(event: DomainEvent): Promise<void>
   ```

3. Create event subscription utility
   ```typescript
   // src/lib/events/subscriber.ts
   export function subscribeToEvent(
     eventType: string,
     handler: (event: DomainEvent) => Promise<void>
   ): void
   ```

4. Set up database triggers for core tables
   - `posts` (feedback)
   - `sentiment_analysis`
   - `themes`
   - `specs`

**Deliverable:** Event publishing and subscription working end-to-end

### Phase 2: Convert Existing Agents to Event-Driven (Week 2)
**Goal:** Refactor current cron-based agents to be event-driven

**Current Agents to Convert:**
1. **Sentiment Analysis Agent**
   - Current: Runs in API route when feedback created
   - New: Subscribes to `feedback.created`, processes, publishes `sentiment.analyzed`

2. **Theme Detection Agent**
   - Current: Batch processing via cron
   - New: Subscribes to `sentiment.analyzed`, updates themes, publishes `theme.updated`

3. **Duplicate Detection Agent**
   - Current: Runs in API route
   - New: Subscribes to `feedback.created`, checks duplicates, publishes `duplicate.found`

4. **Proactive Spec Writer** (from Quick Win #2)
   - Current: Runs daily cron at 9 AM
   - New: Subscribes to `theme.threshold_reached`, auto-drafts specs

**Tasks:**
1. Refactor each agent to:
   - Accept event as input (instead of direct DB queries)
   - Publish events as output (instead of just saving to DB)
   - Handle failures gracefully (retry logic)

2. Create agent registry:
   ```typescript
   // src/lib/agents/registry.ts
   const AGENT_REGISTRY = {
     'feedback.created': [
       SentimentAnalysisAgent,
       DuplicateDetectionAgent,
       NotificationAgent
     ],
     'sentiment.analyzed': [
       ThemeDetectionAgent
     ],
     'theme.threshold_reached': [
       ProactiveSpecWriterAgent
     ]
   };
   ```

**Deliverable:** All existing AI features work via events instead of cron/HTTP

### Phase 3: New Autonomous Agents (Week 3)
**Goal:** Add new agents that weren't possible with HTTP architecture

**New Agents:**

1. **Smart Notification Agent**
   - Subscribes to: All events
   - Publishes: `notification.sent`
   - Logic: Intelligent alerting based on event importance
   - Example: "🚨 Urgent feedback with 10 votes and negative sentiment detected"

2. **Competitive Intelligence Agent**
   - Subscribes to: `feedback.created`, `competitor.mentioned`
   - Publishes: `competitor.feature_detected`, `competitive.threat_identified`
   - Logic: Tracks competitor mentions, identifies feature gaps

3. **User Engagement Agent**
   - Subscribes to: `feedback.created`, `feedback.commented`
   - Publishes: `user.engaged`, `user.at_risk`
   - Logic: Tracks user activity, identifies disengaged users

4. **Spec Quality Agent**
   - Subscribes to: `spec.auto_drafted`
   - Publishes: `spec.quality_checked`
   - Logic: Reviews auto-generated specs for completeness, clarity

5. **Roadmap Health Agent**
   - Subscribes to: `spec.approved`, `spec.completed`
   - Publishes: `roadmap.updated`, `roadmap.stalled`
   - Logic: Monitors roadmap progress, alerts on stalled items

**Deliverable:** 5 new autonomous agents working 24/7

### Phase 4: Event Replay & Debugging (Week 4)
**Goal:** Build tools to monitor, replay, and debug events

**Tasks:**
1. Event viewer dashboard
   - See all events in real-time
   - Filter by type, date, project
   - View event chains (correlation_id)

2. Event replay capability
   - Reprocess failed events
   - Replay events for testing
   - Rebuild projections from events

3. Agent health monitoring
   - Track agent execution time
   - Alert on failures
   - Show event processing lag

**Deliverable:** Full observability into event-driven system

---

## Migration Strategy

### Parallel Running (2 weeks)
- Keep existing HTTP/cron systems running
- Run event-driven agents alongside
- Compare outputs to ensure correctness
- Monitor performance and reliability

### Gradual Cutover
- Week 1: 25% of traffic to event-driven
- Week 2: 50% of traffic
- Week 3: 75% of traffic
- Week 4: 100% of traffic
- Week 5: Deprecate old systems

### Rollback Plan
- Keep old cron jobs disabled but ready
- Feature flag to switch back if needed
- Database maintains both old and new data paths

---

## Success Metrics

### Performance
- **Event processing latency:** < 100ms (vs current ~5s API calls)
- **Agent reaction time:** < 500ms from event publish to processing start
- **Parallel processing:** 5+ agents processing same event simultaneously

### Intelligence
- **Spec auto-draft rate:** 80% of high-volume themes get specs (vs 0% currently)
- **Duplicate detection:** Real-time (vs batch processing)
- **Notification relevance:** 90% of alerts are actionable

### User Experience
- **Real-time updates:** Dashboard updates within 1s of changes
- **Zero manual triggers:** Agents work autonomously
- **Proactive insights:** Users notified before they ask

---

## Technical Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Event loop (infinite events) | High | Medium | Event TTL, max retry limits, circuit breakers |
| Database trigger performance | Medium | Low | Async event publishing, batch inserts |
| Supabase Realtime limits | High | Medium | Fallback to polling, rate limiting |
| Agent failure cascade | High | Low | Isolated failure domains, dead letter queue |
| Event schema evolution | Medium | High | Version field, backward compatibility layer |

---

## Cost Analysis

### Current Costs (Vercel Free Tier)
- Vercel: $0/month (free tier)
- Supabase: $0/month (free tier)
- Total: **$0/month**

### Event-Driven Costs (Estimated)
- Vercel: $0/month (still within free tier limits)
- Supabase: $0/month (Realtime included in free tier)
- Database storage: +50MB for events table (negligible)
- Total: **$0/month** ✅

**No additional costs!** Everything uses existing infrastructure.

---

## Development Timeline

| Phase | Duration | Tasks | Deliverables |
|-------|----------|-------|--------------|
| **Phase 1** | 1 week | Event infrastructure | Events table, pub/sub working |
| **Phase 2** | 1 week | Convert existing agents | 4 agents event-driven |
| **Phase 3** | 1 week | New autonomous agents | 5 new agents |
| **Phase 4** | 1 week | Monitoring & debugging | Event dashboard |
| **Testing** | 2 weeks | Parallel running, validation | Production-ready |
| **Total** | **6 weeks** | | Fully AI-native platform |

---

## What You'll Get

After Option B implementation:

✅ **True real-time architecture** - Events processed in <100ms, not hours
✅ **Autonomous agents** - Working 24/7 without cron schedules
✅ **Parallel processing** - 5+ agents reacting to same event simultaneously
✅ **Proactive intelligence** - System generates insights before users ask
✅ **Scalable foundation** - Easy to add new agents and events
✅ **Zero additional costs** - Uses existing Supabase + Vercel infrastructure
✅ **Production observability** - Event dashboard shows everything happening

**Result:** SignalsLoop becomes a truly AI-native platform where intelligence emerges autonomously from user activity.

---

## Next Steps

1. **Review this plan** - Approve approach, timeline, and scope
2. **Phase 1 kickoff** - Start with event infrastructure
3. **Weekly check-ins** - Review progress, adjust as needed
4. **Parallel testing** - Validate event-driven vs old system
5. **Production cutover** - Gradual migration to event-driven
6. **Celebrate** - Ship AI-native SignalsLoop! 🚀

---

## Questions for You

Before we start:

1. **Timeline:** Is 6 weeks acceptable, or do you need it faster/slower?
2. **Scope:** Any specific agents you want prioritized?
3. **Monitoring:** Do you want a dedicated event dashboard, or is logging sufficient?
4. **Testing:** Should we do parallel running, or direct cutover?
5. **External tools:** Open to Inngest/Trigger.dev as alternatives, or prefer pure Supabase?

Let me know your thoughts and we can begin! 🚀
