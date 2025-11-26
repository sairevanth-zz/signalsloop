# Message Queue Evaluation for SignalsLoop

## Current Architecture Assessment

### Database-First Event System (Current)

**Implementation:**
- Events stored in PostgreSQL `events` table
- Supabase Realtime for push notifications to agents
- Polling fallback when Realtime is unavailable
- Dead letter queue for failed events

**Current Scale:**
- Event volume: Low to medium (<100 events/second)
- Agents: 8 autonomous agents
- Latency: Acceptable (Supabase Realtime ~100-500ms)

### Strengths of Current Approach

✅ **Simplicity**
- Single database for events and data
- No additional infrastructure to manage
- Easy to query event history

✅ **Event Sourcing**
- Full audit trail in database
- Easy to replay events
- Support for temporal queries

✅ **Realtime Integration**
- Supabase Realtime provides push updates
- WebSocket-based (low latency)
- Integrated authentication

✅ **Reliability**
- Dead letter queue implemented
- Polling fallback when Realtime unavailable
- Transactional guarantees (events + data changes)

✅ **Cost-Effective**
- No additional services to pay for
- Supabase Realtime included in plan

### Limitations of Current Approach

⚠️ **Scalability**
- Supabase Realtime limit: ~1000 concurrent connections
- High event volume (>1000/sec) may overwhelm Realtime
- Database polling is resource-intensive

⚠️ **Performance**
- Realtime latency: 100-500ms (vs 10-50ms for Redis Streams)
- Polling interval: 5 seconds (delayed processing)
- Database load increases with event volume

⚠️ **Guaranteed Delivery**
- Realtime is best-effort (can miss events if disconnected)
- No built-in retry mechanism (manual implementation)
- No message acknowledgment

⚠️ **Ordering Guarantees**
- Events processed in parallel (no ordering guarantees)
- No partitioning for ordered processing

---

## When to Migrate to a Dedicated Message Queue

### Triggers for Migration

**Migrate when you hit ANY of these:**

1. **Event Volume > 1000/second**
   - Database becomes bottleneck
   - Realtime connections maxed out

2. **Agent Count > 20**
   - Need better orchestration
   - Complex multi-step workflows

3. **Latency Requirements < 100ms**
   - Realtime too slow
   - Need real-time processing

4. **Guaranteed Delivery Required**
   - Can't afford to lose events
   - Need retry and acknowledgment

5. **Event Ordering Critical**
   - Sequential processing required
   - State-dependent workflows

6. **Multi-Region Deployment**
   - Need distributed event bus
   - Cross-region event propagation

### Recommended Message Queues

#### Option 1: Redis Streams (Recommended for Phase 1)

**Pros:**
- ✅ Upstash Redis already set up for caching
- ✅ Low latency (10-50ms)
- ✅ Consumer groups (multiple agents, load balancing)
- ✅ Message acknowledgment and retry
- ✅ Serverless-friendly (Upstash)
- ✅ Simple migration from current setup

**Cons:**
- ❌ In-memory (data loss if Redis crashes, but Upstash has persistence)
- ❌ Limited retention (configure with MAXLEN)
- ❌ No built-in dead letter queue (manual implementation)

**When to use:**
- Event volume: 100-10,000/sec
- Latency: <100ms required
- Cost-effective ($0-150/month)

**Migration Effort:** Low (1-2 days)

**Example Implementation:**
```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Publish event
await redis.xadd('events:feedback.created', '*', {
  aggregate_id: feedbackId,
  payload: JSON.stringify(payload),
})

// Consume events with consumer group
const events = await redis.xreadgroup(
  'GROUP', 'sentiment-agent', 'worker-1',
  'STREAMS', 'events:feedback.created', '>'
)

// Process and acknowledge
for (const event of events) {
  await processEvent(event)
  await redis.xack('events:feedback.created', 'sentiment-agent', event.id)
}
```

---

#### Option 2: AWS SQS/SNS (Recommended for Production Scale)

**Pros:**
- ✅ Fully managed (no infrastructure)
- ✅ Guaranteed delivery
- ✅ Dead letter queue built-in
- ✅ Automatic retries with exponential backoff
- ✅ Scalable (millions of events/sec)
- ✅ Fan-out pattern (SNS → multiple SQS queues)

**Cons:**
- ❌ Higher latency (100-500ms)
- ❌ AWS vendor lock-in
- ❌ Requires AWS account
- ❌ More complex setup

**When to use:**
- Event volume: >10,000/sec
- Need guaranteed delivery
- Multi-region deployment
- Enterprise production system

**Migration Effort:** Medium (3-5 days)

**Cost:** $0.40 per million requests (very cheap)

**Example Implementation:**
```typescript
import { SQSClient, SendMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs'

const sqs = new SQSClient({ region: 'us-east-1' })

// Publish event
await sqs.send(new SendMessageCommand({
  QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/feedback-created',
  MessageBody: JSON.stringify(event),
  MessageAttributes: {
    eventType: { DataType: 'String', StringValue: 'feedback.created' },
  },
}))

// Consume events
const messages = await sqs.send(new ReceiveMessageCommand({
  QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/feedback-created',
  MaxNumberOfMessages: 10,
  WaitTimeSeconds: 20, // Long polling
}))

// Process and delete
for (const message of messages.Messages) {
  await processEvent(JSON.parse(message.Body))
  await sqs.send(new DeleteMessageCommand({
    QueueUrl: queue,
    ReceiptHandle: message.ReceiptHandle,
  }))
}
```

---

#### Option 3: RabbitMQ (Self-Hosted or CloudAMQP)

**Pros:**
- ✅ Feature-rich (routing, exchanges, TTL)
- ✅ Low latency
- ✅ Strong ordering guarantees
- ✅ Dead letter exchange built-in
- ✅ Open-source (no vendor lock-in)

**Cons:**
- ❌ Infrastructure to manage (unless using CloudAMQP)
- ❌ More complex than Redis/SQS
- ❌ Requires maintenance

**When to use:**
- Need advanced routing
- Complex event workflows
- Self-hosted infrastructure

**Migration Effort:** Medium-High (5-7 days)

---

## Recommendation: Phased Approach

### Phase 1: Current System (0-10K events/day)
**Status:** ✅ **SUFFICIENT** - No action needed

- Continue using database-first events
- Monitor event volume and latency
- Track Realtime connection count

**Action:** Set up monitoring dashboards

---

### Phase 2: Add Redis Streams (>10K events/day OR <100ms latency needed)
**Status:** ⏳ **READY TO IMPLEMENT** (when needed)

**Migration Steps:**

1. **Set up Redis Streams** (using existing Upstash Redis)
```typescript
// Create new event publisher
export async function publishEventToRedis(event: DomainEvent) {
  const stream = `events:${event.type}`

  await redis.xadd(stream, '*', {
    id: event.id,
    aggregate_type: event.aggregate_type,
    aggregate_id: event.aggregate_id,
    payload: JSON.stringify(event.payload),
    metadata: JSON.stringify(event.metadata),
  })
}
```

2. **Update agents to consume from Redis**
```typescript
// Consumer group for each agent
export async function startRedisAgent(agentName: string, eventType: string, handler: EventHandler) {
  const stream = `events:${eventType}`
  const group = `agent:${agentName}`

  // Create consumer group
  await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM')

  // Consume loop
  while (true) {
    const events = await redis.xreadgroup(
      'GROUP', group, `worker-${Date.now()}`,
      'BLOCK', 5000,
      'STREAMS', stream, '>'
    )

    for (const event of events) {
      await handler(parseEvent(event))
      await redis.xack(stream, group, event.id)
    }
  }
}
```

3. **Dual-write to both systems during migration**
   - Write events to database (for audit trail)
   - Publish to Redis Streams (for agent processing)
   - Agents consume from Redis
   - Keep database for queries and replay

4. **Gradually migrate agents from Realtime to Redis**

**Effort:** 2-3 days
**Cost:** $0/month (free tier) to $20/month (10M events/month)

---

### Phase 3: Migrate to SQS/SNS (Production Scale >100K events/day)
**Status:** ⏸️ **NOT NEEDED YET**

**Migrate when:**
- Event volume exceeds Redis Streams capacity
- Multi-region deployment required
- Need guaranteed delivery SLAs

**Effort:** 5-7 days
**Cost:** ~$40/month (10M events/month)

---

## Monitoring & Alerting

### Key Metrics to Track

**Event Volume:**
- Events/second
- Events/day by type
- Alert threshold: >500/sec

**Latency:**
- Event publish latency
- Agent processing latency
- Alert threshold: >1 second

**Reliability:**
- Failed events (dead letter queue)
- Agent errors
- Alert threshold: >1% error rate

**Scalability:**
- Realtime connections
- Database query time
- Alert threshold: >100ms database latency

### Monitoring Dashboard

Create `/api/events/metrics`:
```typescript
export async function GET() {
  const metrics = {
    eventVolume: await getEventVolume(),
    latency: await getAverageLatency(),
    errorRate: await getErrorRate(),
    realtimeConnections: await getRealtimeConnectionCount(),
  }

  return Response.json(metrics)
}
```

---

## Decision Matrix

| Metric | Current (DB + Realtime) | Redis Streams | AWS SQS |
|--------|------------------------|---------------|---------|
| **Max Events/sec** | ~100 | ~10,000 | Unlimited |
| **Latency** | 100-500ms | 10-50ms | 100-500ms |
| **Guaranteed Delivery** | ❌ Best-effort | ✅ Yes | ✅ Yes |
| **Ordering** | ❌ Parallel | ✅ Per partition | ✅ FIFO queues |
| **Infrastructure** | None | Upstash | AWS |
| **Cost (10K events/day)** | $0 | $0 | $0.12/month |
| **Cost (1M events/day)** | Included | $20/month | $12/month |
| **Setup Effort** | Done ✓ | Low | Medium |
| **Maintenance** | None | Minimal | None |

---

## Final Recommendation

### Current Status: ✅ **NO ACTION REQUIRED**

**Your database-first event system is perfectly adequate for:**
- Current scale (<10K events/day)
- 8 agents
- Acceptable latency (100-500ms)

### Future Actions:

**Monitor these metrics:**
```typescript
// Add to /api/admin/metrics
{
  "events_per_day": 2500,
  "avg_latency_ms": 300,
  "realtime_connections": 45,
  "error_rate": 0.002,
  "recommendation": "Continue with current system"
}
```

**Trigger migration when:**
- Events/day > 10,000 → **Migrate to Redis Streams**
- Events/day > 100,000 → **Migrate to AWS SQS**
- Latency requirements < 100ms → **Migrate to Redis Streams**
- Multi-region required → **Migrate to AWS SQS**

---

## Migration Plan (When Needed)

### Step 1: Add Redis Streams (Low Effort)

1. Use existing Upstash Redis
2. Create stream publisher wrapper
3. Update one agent as test (sentiment-agent)
4. Monitor performance
5. Gradually migrate remaining agents
6. Keep database events for audit trail

**Timeline:** 2-3 days
**Risk:** Low (fallback to current system)

### Step 2: Production Optimization

1. Tune consumer group settings
2. Implement retry logic
3. Add monitoring dashboards
4. Load testing

**Timeline:** 1-2 days

---

## Conclusion

**Verdict:** Your current database-first event system is **production-ready** for your current scale.

**Action:**
- ✅ No immediate migration needed
- 📊 Set up monitoring to track event volume and latency
- 📋 Revisit this evaluation when events/day > 10,000

**When to migrate:** You'll know when the time comes based on metrics. Until then, focus on shipping features! 🚀
