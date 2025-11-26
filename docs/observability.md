# Observability Infrastructure

SignalsLoop includes comprehensive observability infrastructure for monitoring distributed systems, AI agents, and multi-step workflows.

## Distributed Tracing (OpenTelemetry)

### Overview

OpenTelemetry provides distributed tracing across:
- HTTP requests and API routes
- Database queries (Postgres)
- AI agent executions
- AI model API calls
- Multi-step workflows

### Configuration

1. **Enable Tracing**

Add to `.env`:
```bash
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-observability-platform.com/v1/traces
OTEL_EXPORTER_OTLP_HEADERS={"api-key": "your-key"}
```

2. **Supported Platforms**

- **Datadog**: `https://http-intake.logs.datadoghq.com/v1/traces`
- **Honeycomb**: `https://api.honeycomb.io/v1/traces`
- **Jaeger (local)**: `http://localhost:4318/v1/traces`
- **Grafana Tempo**: `https://tempo.grafana.net/v1/traces`

### Usage

#### Trace Agent Executions

```typescript
import { traceAgent } from '@/lib/observability/tracing'

// In your agent file
async function processEvent(event: Event) {
  return traceAgent('sentiment-agent', async (span) => {
    span.setAttribute('feedback_id', event.payload.feedback_id)

    const sentiment = await analyzeSentiment(event.payload.content)

    recordSpanEvent('sentiment-detected', {
      sentiment,
      confidence: 0.92
    })

    return sentiment
  }, {
    eventType: event.type,
    eventId: event.id,
    tenantId: event.tenant_id
  })
}
```

#### Trace AI Model Calls

```typescript
import { traceAICall, recordTokenUsage } from '@/lib/observability/tracing'

const response = await traceAICall('openai-gpt4', async (span) => {
  span.setAttribute('prompt_type', 'sentiment-analysis')

  const result = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...]
  })

  recordTokenUsage(result.usage)

  return result
}, {
  provider: 'openai'
})
```

#### Trace Database Queries

```typescript
import { traceDB } from '@/lib/observability/tracing'

const feedback = await traceDB('get-feedback-by-id', async (span) => {
  span.setAttribute('feedback_id', id)

  return await supabase
    .from('feedback')
    .select('*')
    .eq('id', id)
    .single()
}, {
  table: 'feedback'
})
```

#### Trace Async Operations

```typescript
import { traceAsync } from '@/lib/observability/tracing'

const result = await traceAsync('generate-spec', async (span) => {
  span.setAttribute('theme_id', themeId)
  span.setAttribute('feedback_count', feedbackCount)

  const spec = await generateSpec(themeId)

  return spec
})
```

### Trace Attributes

Standard attributes added to spans:

**Agent Traces:**
- `agent.name`: Agent identifier
- `event.type`: Event type that triggered the agent
- `event.id`: Event ID
- `tenant.id`: Tenant identifier

**AI Model Traces:**
- `ai.model`: Model name (e.g., gpt-4, claude-3)
- `ai.provider`: Provider (e.g., openai, anthropic)
- `ai.tokens.prompt`: Prompt tokens used
- `ai.tokens.completion`: Completion tokens used
- `ai.tokens.total`: Total tokens used

**Database Traces:**
- `db.table`: Table name
- `db.query`: Query text (sanitized)

### Viewing Traces

#### Datadog
1. Go to APM > Traces
2. Filter by service: `signalsloop`
3. View distributed traces across agents

#### Honeycomb
1. Go to Traces
2. Query: `service.name = signalsloop`
3. Visualize multi-agent workflows

#### Local Jaeger
```bash
# Run Jaeger locally
docker run -d --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# View traces at http://localhost:16686
```

### Debugging Multi-Agent Workflows

Example trace for "Competitive Launch Response" workflow:

```
agent.competitor-watchdog [200ms]
  └─ db.detect-competitor-changes [50ms]
  └─ agent.competitive-intel [100ms]
      └─ ai.openai-gpt4 [800ms]
          └─ ai.tokens.total: 1500
  └─ agent.impact-analyzer [150ms]
      └─ db.calculate-revenue-impact [80ms]
  └─ agent.response-generator [500ms]
      └─ ai.openai-gpt4 [1200ms]
          └─ ai.tokens.total: 3200
  └─ agent.notification [50ms]
```

### Performance Metrics

Track key metrics:
- Agent execution time
- AI model latency
- Database query performance
- Token usage per operation
- Error rates by component

### Best Practices

1. **Meaningful Span Names**: Use descriptive names like `agent.sentiment-analysis`, not generic names like `process`
2. **Rich Attributes**: Add context (IDs, counts, types) to spans for filtering
3. **Record Events**: Use `recordSpanEvent()` for important milestones within a span
4. **Error Handling**: Exceptions are automatically recorded with stack traces
5. **Sampling**: In high-volume scenarios, configure sampling in `instrumentation.ts`

### Troubleshooting

**Traces not appearing?**
- Check `ENABLE_TRACING=true` in `.env`
- Verify `OTEL_EXPORTER_OTLP_ENDPOINT` is correct
- Check authentication headers in `OTEL_EXPORTER_OTLP_HEADERS`
- Review logs: `[OpenTelemetry] Tracing initialized successfully`

**High cardinality warnings?**
- Avoid adding high-cardinality values to span names (e.g., user IDs)
- Use attributes instead: `span.setAttribute('user_id', userId)`

**Performance impact?**
- Tracing overhead is typically <1% of request latency
- Disable filesystem instrumentation (already disabled in config)
- Configure sampling for high-throughput endpoints

---

## Centralized Structured Logging

### Overview

Structured logging with **Pino** replaces `console.log` across the codebase with JSON logs that are:
- Searchable and filterable
- Automatically correlated with traces
- Ready for log aggregation platforms (Datadog, LogDNA, Splunk)
- Performance-optimized (Pino is 5x faster than Winston)

### Configuration

Add to `.env`:
```bash
# Log level: trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# Pretty-print logs in development (human-readable)
PRETTY_LOGS=true  # Development only
```

### Usage

#### Basic Logging

```typescript
import logger from '@/lib/observability/logger'

// Info level
logger.info('Processing feedback', { feedbackId, userId })

// Error level with full stack trace
logger.error({ error }, 'Failed to analyze sentiment')

// Debug level (only shown if LOG_LEVEL=debug)
logger.debug('Cache hit', { key, ttl })

// Warning level
logger.warn('High token usage detected', { tokens: 5000, cost: 0.10 })
```

#### Agent Logging

```typescript
import { agentLogger } from '@/lib/observability/logger'

const log = agentLogger('sentiment-agent', { tenantId, eventId })

log.info('Starting sentiment analysis', { feedbackId })
log.debug('Extracted features', { features })
log.info('Sentiment detected', { sentiment: 'positive', confidence: 0.92 })
```

#### API Route Logging

```typescript
import { apiLogger } from '@/lib/observability/logger'

export async function POST(req: Request) {
  const log = apiLogger('/api/feedback/create', { userId })

  log.info('Received feedback creation request')

  try {
    const feedback = await createFeedback(data)
    log.info('Feedback created successfully', { feedbackId: feedback.id })
    return Response.json(feedback)
  } catch (error) {
    log.error({ error }, 'Failed to create feedback')
    throw error
  }
}
```

#### Database Logging

```typescript
import { dbLogger } from '@/lib/observability/logger'

const log = dbLogger('feedback', { operation: 'insert' })

log.debug('Inserting feedback', { feedbackId })
const result = await supabase.from('feedback').insert(data)
log.info('Feedback inserted', { feedbackId, duration_ms: 45 })
```

#### AI Model Logging

```typescript
import { aiLogger, trackTokenUsage } from '@/lib/observability/logger'

const log = aiLogger('openai-gpt4', { operation: 'sentiment-analysis' })

log.info('Calling OpenAI API', { promptTokens: 500 })

const response = await openai.chat.completions.create({...})

trackTokenUsage('openai-gpt4', {
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
  totalTokens: response.usage.total_tokens,
  operation: 'sentiment-analysis',
  cost: calculateCost(response.usage.total_tokens)
})
```

#### Performance Timing

```typescript
import { startTimer } from '@/lib/observability/logger'

const timer = startTimer('generate-spec')

// ... perform operation ...

timer.end({ themeId, specId, feedbackCount: 25 })
// Logs: { operation: 'generate-spec', duration_ms: 1234, themeId, specId, feedbackCount }
```

#### Error Logging

```typescript
import { logError } from '@/lib/observability/logger'

try {
  await processEvent(event)
} catch (error) {
  logError('Failed to process event', error, {
    eventId: event.id,
    eventType: event.type,
    tenantId: event.tenant_id
  })
  throw error
}
```

### Log Levels

- **trace**: Very detailed debugging info
- **debug**: Debugging info (not shown in production by default)
- **info**: General informational messages (default)
- **warn**: Warning messages that need attention
- **error**: Error messages with stack traces
- **fatal**: Critical errors that crash the application

### Log Structure

All logs are JSON objects with:

```json
{
  "level": 30,
  "time": 1701234567890,
  "service": "signalsloop",
  "environment": "production",
  "version": "1.0.0",
  "component": "agent",
  "agent": "sentiment-agent",
  "tenantId": "abc123",
  "eventId": "evt_456",
  "msg": "Sentiment detected",
  "sentiment": "positive",
  "confidence": 0.92
}
```

### Security: Sensitive Data Redaction

The following fields are automatically redacted:
- `password`, `*.password`
- `apiKey`, `api_key`, `*.apiKey`
- `token`, `accessToken`, `access_token`
- `refreshToken`, `refresh_token`
- `secret`

```typescript
logger.info('User logged in', {
  userId: '123',
  password: 'secret123'  // Automatically redacted in logs
})
// Output: { userId: '123', password: '[Redacted]' }
```

### Centralized Log Aggregation

#### Datadog

1. Install Datadog agent on your servers
2. Configure Datadog to collect logs from `stdout`
3. Logs automatically appear in Datadog Logs

```bash
# Datadog automatically parses JSON logs
# No additional configuration needed
```

#### LogDNA / Mezmo

```bash
# Forward logs to LogDNA
npm install @logdna/logger

# In production, use LogDNA transport
# Update logger.ts with LogDNA transport
```

#### AWS CloudWatch

```bash
# Use AWS CloudWatch Logs agent
# Automatically parses JSON from ECS/Lambda stdout
```

### Querying Logs

**Find all errors from sentiment-agent:**
```
component:agent agent:sentiment-agent level:error
```

**Find high token usage:**
```
component:ai total_tokens:>2000
```

**Find slow operations:**
```
duration_ms:>1000
```

**Correlation with traces:**
- Logs automatically include trace IDs when using OpenTelemetry
- Click a log in Datadog → View related traces
- Click a trace span → View related logs

### Migration from console.log

**Before:**
```typescript
console.log('Processing feedback', feedbackId)
console.error('Error:', error)
```

**After:**
```typescript
import logger from '@/lib/observability/logger'

logger.info('Processing feedback', { feedbackId })
logger.error({ error }, 'Failed to process feedback')
```

### Best Practices

1. **Use structured context**: Always pass objects with context
   - ✅ `logger.info('Created', { feedbackId, userId })`
   - ❌ `logger.info('Created feedback ' + feedbackId)`

2. **Use appropriate log levels**:
   - `debug`: Detailed debugging (not in production)
   - `info`: Normal operations
   - `warn`: Potential issues
   - `error`: Failures that need investigation

3. **Include correlation IDs**: Add `tenantId`, `userId`, `eventId` to track requests across services

4. **Log operation results, not just starts**:
   - ✅ `log.info('Sentiment analyzed', { sentiment, confidence, duration })`
   - ❌ `log.info('Starting sentiment analysis')`

5. **Use child loggers for context**:
   ```typescript
   const log = logger.child({ tenantId, userId })
   log.info('Action 1')  // tenantId, userId automatically included
   log.info('Action 2')  // tenantId, userId automatically included
   ```

---

## Redis Caching Layer (Upstash)

### Overview

Redis cache replaces the in-memory cache with **Upstash Redis**, providing:
- **Persistence**: Cache survives server restarts
- **Distribution**: Shared cache across multiple instances (horizontal scaling)
- **Serverless-friendly**: No connection pooling issues
- **Automatic TTL**: Redis handles expiration natively

### Setup

1. **Create Upstash Redis Database**

Visit https://upstash.com:
- Sign up for free account
- Create new Redis database (select region closest to your app)
- Copy REST URL and REST token

2. **Configure Environment**

Add to `.env`:
```bash
UPSTASH_REDIS_REST_URL=https://us1-expert-swan-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYXXASQgYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=
```

3. **Automatic Fallback**

If Redis credentials are not configured, the cache automatically falls back to in-memory caching (same as before).

### Usage

#### Replace In-Memory Cache

**Before (in-memory):**
```typescript
import { cacheManager, withCache } from '@/lib/ai-cache-manager'

const cached = cacheManager.sentiment.get('sentiment', { content })
```

**After (Redis):**
```typescript
import { redisCacheManager, withRedisCache } from '@/lib/observability/redis-cache'

// All operations are now async
const cached = await redisCacheManager.sentiment.get({ content })
```

#### Cached AI Functions

```typescript
import { withRedisCache } from '@/lib/observability/redis-cache'

// Wrap your AI function with Redis cache
const cachedSentimentAnalysis = withRedisCache(
  analyzeSentiment,
  'sentiment',
  (content) => ({ content })  // Cache key generator
)

// Use it normally - caching is transparent
const sentiment = await cachedSentimentAnalysis('This product is amazing!')
// First call: Cache miss → calls AI → stores in Redis
// Second call: Cache hit → returns from Redis (saves $$$)
```

#### Available Caches

All caches from `ai-cache-manager.ts` are available in Redis:

```typescript
redisCacheManager.categorization      // 1 hour TTL
redisCacheManager.smartReplies        // 30 min TTL
redisCacheManager.duplicateDetection  // 2 hours TTL
redisCacheManager.priorityScoring     // 15 min TTL
redisCacheManager.writingAssistant    // 10 min TTL
redisCacheManager.sentiment           // 1 hour TTL
redisCacheManager['theme-detection']  // 2 hours TTL
redisCacheManager.embeddings          // 24 hours TTL (embeddings are expensive!)
redisCacheManager.specs               // 1 hour TTL
redisCacheManager.competitive         // 4 hours TTL
```

#### Manual Cache Operations

```typescript
import { redisCacheManager } from '@/lib/observability/redis-cache'

// Get from cache
const cached = await redisCacheManager.sentiment.get({ content: 'Hello' })

// Set in cache (with default TTL)
await redisCacheManager.sentiment.set({ content: 'Hello' }, { sentiment: 'positive' })

// Set with custom TTL (in seconds)
await redisCacheManager.sentiment.set({ content: 'Hello' }, { sentiment: 'positive' }, 7200)

// Check if key exists
const exists = await redisCacheManager.sentiment.exists({ content: 'Hello' })

// Get remaining TTL (in seconds)
const ttl = await redisCacheManager.sentiment.ttl({ content: 'Hello' })

// Delete specific key
await redisCacheManager.sentiment.del({ content: 'Hello' })

// Clear all keys for a cache
await redisCacheManager.sentiment.clear()
```

### Cache Statistics

```typescript
import { getRedisCacheStats, checkRedisHealth } from '@/lib/observability/redis-cache'

// Get cache statistics
const stats = await getRedisCacheStats()
console.log(stats)
// {
//   sentiment: { keys: 150, backend: 'redis' },
//   embeddings: { keys: 1200, backend: 'redis' },
//   ...
// }

// Health check
const isHealthy = await checkRedisHealth()
if (!isHealthy) {
  console.warn('Redis is down, using in-memory fallback')
}
```

### Cache Stats API Endpoint

Create `/api/cache/stats` to monitor cache:

```typescript
import { getRedisCacheStats } from '@/lib/observability/redis-cache'

export async function GET() {
  const stats = await getRedisCacheStats()
  return Response.json(stats)
}
```

### Migration from In-Memory Cache

1. **Install Upstash Redis** (already done ✓)
2. **Configure environment variables** (add to `.env`)
3. **Update imports**:
   - Replace `import { cacheManager } from '@/lib/ai-cache-manager'`
   - With `import { redisCacheManager } from '@/lib/observability/redis-cache'`
4. **Make cache calls async**:
   - `cache.get()` → `await cache.get()`
   - `cache.set()` → `await cache.set()`
5. **Deploy** - cache now persists and scales!

### Performance

**In-Memory Cache:**
- ✅ Fast (no network overhead)
- ❌ Lost on restart
- ❌ Not shared across instances
- ❌ Memory limited

**Redis Cache (Upstash):**
- ✅ Persistent
- ✅ Shared across instances
- ✅ No memory limits
- ⚡ ~10-50ms latency (Upstash uses global edge network)

### Cost Estimation

**Upstash Pricing** (as of 2024):
- Free tier: 10,000 commands/day
- Pay-as-you-go: $0.20 per 100K commands
- Pro: $150/month (20M commands included)

**Typical Usage:**
- 1000 AI calls/day → ~2000 cache commands/day (get + set)
- Free tier sufficient for most early-stage apps
- Heavy usage (~100K AI calls/day) → ~$40/month

**Cost Savings:**
- Each cache hit saves an AI API call
- GPT-4 call: ~$0.03 (assuming 1K tokens)
- Cache hit: ~$0.000002 (Redis command)
- **Savings per hit: ~$0.03** 💰

If 50% cache hit rate on 10K calls/day:
- Saves: 5000 calls/day × $0.03 = **$150/day**
- Redis cost: ~$20/month
- **Net savings: ~$4,500/month** 🎉

### Best Practices

1. **Use appropriate TTLs**:
   - Short TTL for dynamic data (sentiment: 1 hour)
   - Long TTL for expensive, static data (embeddings: 24 hours)

2. **Cache key design**:
   - Include all relevant parameters in cache key
   - Keys are hashed (MD5), so don't worry about size

3. **Monitoring**:
   - Track cache hit rates via `/api/cache/stats`
   - Alert on low hit rates (might indicate cache invalidation issues)

4. **Error handling**:
   - Cache failures gracefully degrade to in-memory cache
   - App continues working even if Redis is down

5. **Invalidation**:
   - Clear cache when data changes: `await cache.clear()`
   - Or delete specific keys: `await cache.del(cacheKey)`

### Troubleshooting

**Cache always misses?**
- Check Redis credentials in `.env`
- Verify Upstash dashboard shows commands
- Check logs: `Redis cache initialized` or `falling back to in-memory cache`

**Slow cache operations?**
- Check Upstash region (should match app region)
- Monitor Upstash latency in dashboard
- Consider upgrading to Pro tier for better performance

**Out of memory errors?**
- Upstash has memory limits based on tier
- Consider lowering TTLs or clearing old caches
- Upgrade to larger tier if needed

---

## Next Steps

- [x] Set up OpenTelemetry for distributed tracing
- [x] Implement centralized structured logging (Pino)
- [ ] Set up Datadog/Honeycomb account
- [ ] Configure OTEL environment variables
- [ ] Deploy with tracing and logging enabled
- [ ] Create dashboards for agent performance
- [ ] Set up alerts for high latency or errors
- [ ] Replace console.log with structured logging across codebase
