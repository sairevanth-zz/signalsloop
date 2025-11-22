# Event-Driven Architecture

SignalsLoop's event-driven architecture enables autonomous AI agents to work 24/7, reacting to events in real-time.

## 📚 Overview

This directory contains the core event infrastructure for SignalsLoop's AI-native architecture:

- **Event Publishing**: Functions to publish domain events
- **Event Subscription**: Functions to subscribe to events and react
- **Type Definitions**: TypeScript types for events and handlers
- **Agent Registry**: Mapping of events to agent handlers

## 🏗️ Architecture

```
User creates feedback
       ↓
Database trigger publishes: feedback.created
       ↓
Multiple agents react in parallel:
  → Sentiment Agent (analyzes sentiment)
  → Theme Agent (categorizes)
  → Duplicate Agent (checks duplicates)
  → Notification Agent (alerts team)
       ↓
Sentiment analyzed
       ↓
Database trigger publishes: sentiment.analyzed
       ↓
Theme Agent reacts:
  → Updates theme frequency
  → Publishes: theme.threshold_reached (if 20+ feedback)
       ↓
Spec Writer Agent reacts:
  → Auto-drafts spec
  → Publishes: spec.auto_drafted
       ↓
Notification Agent alerts PM
```

## 📦 Components

### 1. Events Table (`events`)

Stores all domain events in the system:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,              -- e.g., 'feedback.created'
  aggregate_type TEXT NOT NULL,    -- e.g., 'post'
  aggregate_id UUID NOT NULL,      -- ID of the entity
  payload JSONB NOT NULL,          -- Event data
  metadata JSONB NOT NULL,         -- Context (project_id, user_id, etc.)
  version INTEGER DEFAULT 1,       -- Schema version
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Database Triggers

Automatically publish events when data changes:

- **Posts triggers**: `feedback.created`, `feedback.updated`, `feedback.voted`
- **Sentiment triggers**: `sentiment.analyzed`, `sentiment.updated`
- **Theme triggers**: `theme.detected`, `theme.updated`, `theme.threshold_reached`
- **Spec triggers**: `spec.auto_drafted`, `spec.approved`, `spec.updated`

### 3. Event Publisher

Publish events from your code:

```typescript
import { publishEvent, EventType, AggregateType } from '@/lib/events';

await publishEvent({
  type: EventType.FEEDBACK_CREATED,
  aggregate_type: AggregateType.POST,
  aggregate_id: post.id,
  payload: {
    title: post.title,
    content: post.content,
  },
  metadata: {
    project_id: post.project_id,
    user_id: user.id,
    source: 'api',
  },
  version: 1,
});
```

### 4. Event Subscriber

Subscribe to events and react:

```typescript
import { subscribeToEvent, EventType } from '@/lib/events';

const subscription = await subscribeToEvent(
  EventType.FEEDBACK_CREATED,
  async (event) => {
    console.log('New feedback:', event.payload);
    // Process the event...
  }
);

// Later, cleanup:
await subscription.unsubscribe();
```

## 🎯 Event Types

### Feedback Domain
- `feedback.created` - New feedback submitted
- `feedback.updated` - Feedback edited
- `feedback.voted` - Vote count changed
- `feedback.commented` - Comment added
- `feedback.deleted` - Feedback removed

### AI Analysis Domain
- `sentiment.analyzed` - Sentiment computed
- `theme.detected` - Theme identified
- `theme.updated` - Theme metrics changed
- `theme.threshold_reached` - Theme hit 20+ feedback (triggers spec)
- `duplicate.found` - Duplicate detected

### Spec Domain
- `spec.auto_drafted` - AI generated spec
- `spec.approved` - PM approved spec
- `spec.rejected` - Spec archived
- `spec.updated` - Spec content changed
- `spec.linked` - Feedback linked to spec

### Competitive Domain
- `competitor.mentioned` - Competitor found in feedback
- `competitor.feature_detected` - Competitor feature identified

## 🚀 Usage Examples

### Example 1: Publishing an Event

```typescript
import { publishEvent, createCorrelationId } from '@/lib/events';

const correlationId = createCorrelationId();

await publishEvent({
  type: 'feedback.created',
  aggregate_type: 'post',
  aggregate_id: feedbackId,
  payload: { title, content, category },
  metadata: {
    project_id: projectId,
    user_id: userId,
    correlation_id: correlationId,
    source: 'web_form',
  },
  version: 1,
});
```

### Example 2: Subscribing to Events

```typescript
import { subscribeToEvent } from '@/lib/events';

// Subscribe to sentiment analyzed events
const { unsubscribe } = await subscribeToEvent(
  'sentiment.analyzed',
  async (event) => {
    const { sentiment_score, post_id } = event.payload;

    if (sentiment_score < -0.7) {
      // Alert on very negative feedback
      await sendSlackNotification({
        message: `🚨 Urgent: Very negative feedback detected`,
        postId: post_id,
      });
    }
  },
  {
    projectId: 'your-project-id', // Optional: filter by project
  }
);
```

### Example 3: Batch Publishing

```typescript
import { publishEvents } from '@/lib/events';

const events = feedbackItems.map(item => ({
  type: 'feedback.created',
  aggregate_type: 'post',
  aggregate_id: item.id,
  payload: { title: item.title },
  metadata: { project_id: projectId },
  version: 1,
}));

await publishEvents(events); // More efficient than individual publishes
```

## 🧪 Testing

Test the event system:

```bash
# Run event tests
ts-node src/lib/events/test-events.ts

# Or create an API route:
# GET /api/test/events
```

## 📊 Monitoring

Query events in the database:

```sql
-- See all events for a project
SELECT * FROM events
WHERE metadata->>'project_id' = 'your-project-id'
ORDER BY created_at DESC
LIMIT 100;

-- See all events of a specific type
SELECT * FROM events
WHERE type = 'feedback.created'
ORDER BY created_at DESC
LIMIT 50;

-- Trace an event chain by correlation_id
SELECT * FROM events
WHERE metadata->>'correlation_id' = 'some-correlation-id'
ORDER BY created_at ASC;

-- Count events by type
SELECT type, COUNT(*) as count
FROM events
GROUP BY type
ORDER BY count DESC;
```

## 🔄 Event Flow Patterns

### Pattern 1: Chain Reaction

```
feedback.created
  ↓
sentiment.analyzed
  ↓
theme.detected
  ↓
theme.threshold_reached
  ↓
spec.auto_drafted
```

### Pattern 2: Parallel Processing

```
feedback.created
  ↓
  ├─→ Sentiment Agent
  ├─→ Duplicate Agent
  ├─→ Notification Agent
  └─→ Competitive Intel Agent
```

### Pattern 3: Conditional Triggering

```
theme.updated
  ↓
IF frequency >= 20
  ↓
theme.threshold_reached
  ↓
spec.auto_drafted
```

## 🛠️ Development Phases

### ✅ Phase 1: Event Infrastructure (CURRENT)
- Events table created
- Database triggers set up
- Publisher/Subscriber utilities built
- Type definitions complete

### ⏳ Phase 2: Convert Existing Agents (NEXT)
- Refactor Sentiment Analysis Agent
- Refactor Theme Detection Agent
- Refactor Duplicate Detection Agent
- Refactor Proactive Spec Writer

### ⏳ Phase 3: New Autonomous Agents
- Smart Notification Agent
- Competitive Intelligence Agent
- User Engagement Agent
- Spec Quality Agent
- Roadmap Health Agent

### ⏳ Phase 4: Monitoring & Debugging
- Event viewer dashboard
- Event replay capability
- Agent health monitoring

## 🔐 Security

- **Row-Level Security**: Events respect project ownership
- **Service Role**: Publishers use service role for writes
- **Validation**: Event schema validated before insertion
- **Rate Limiting**: Consider rate limits for high-volume events

## ⚡ Performance

- **Indexes**: Optimized for common query patterns
- **Batching**: Use `publishEvents()` for bulk operations
- **Async**: All event processing is asynchronous
- **Realtime**: Supabase Realtime for instant notifications

## 📝 Best Practices

1. **Use correlation IDs**: Track related events across the system
2. **Keep payloads small**: Store references, not full objects
3. **Version events**: Use version field for schema evolution
4. **Log events**: Events are immutable audit logs
5. **Handle failures**: Implement retry logic and dead letter queues

## 🐛 Troubleshooting

### Events not being published?
- Check database triggers are installed
- Verify service role credentials
- Check function logs for errors

### Events not being received?
- Verify Supabase Realtime is enabled
- Check subscription filters
- Try polling as fallback

### High event volume?
- Use batch publishing
- Implement rate limiting
- Consider event aggregation

## 📚 Resources

- [Option B Plan](../../../OPTION_B_EVENT_DRIVEN_PLAN.md)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
