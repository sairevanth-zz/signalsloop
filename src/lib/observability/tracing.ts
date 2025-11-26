import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api'

/**
 * Tracing utilities for SignalsLoop
 *
 * Use these helpers to instrument your code with distributed tracing:
 * - Agent workflows
 * - API routes
 * - Database operations
 * - AI model calls
 */

const tracer = trace.getTracer('signalsloop')

export interface TraceOptions {
  attributes?: Record<string, string | number | boolean>
  kind?: 'internal' | 'server' | 'client'
}

/**
 * Trace a function execution with automatic error handling
 *
 * @example
 * const result = await traceAsync('analyze-sentiment', async (span) => {
 *   span.setAttribute('feedback_id', feedbackId)
 *   return await analyzeSentiment(feedbackId)
 * })
 */
export async function traceAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options: TraceOptions = {}
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes: options.attributes }, async (span) => {
    try {
      const result = await fn(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Trace a synchronous function execution
 *
 * @example
 * const score = trace('calculate-priority', (span) => {
 *   span.setAttribute('feedback_count', feedbackCount)
 *   return calculatePriorityScore(feedback)
 * })
 */
export function traceSync<T>(
  name: string,
  fn: (span: Span) => T,
  options: TraceOptions = {}
): T {
  return tracer.startActiveSpan(name, { attributes: options.attributes }, (span) => {
    try {
      const result = fn(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Add attributes to the current active span
 *
 * @example
 * addSpanAttributes({ user_id: '123', tenant: 'acme' })
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>) {
  const span = trace.getActiveSpan()
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value)
    })
  }
}

/**
 * Record an event on the current span
 *
 * @example
 * recordSpanEvent('feedback-analyzed', { sentiment: 'positive', score: 0.85 })
 */
export function recordSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>
) {
  const span = trace.getActiveSpan()
  if (span) {
    span.addEvent(name, attributes)
  }
}

/**
 * Trace an agent execution with rich metadata
 *
 * @example
 * await traceAgent('sentiment-agent', async (span) => {
 *   span.setAttribute('feedback_id', feedbackId)
 *   const sentiment = await analyzeSentiment(feedback)
 *   recordSpanEvent('sentiment-detected', { sentiment, confidence: 0.92 })
 *   return sentiment
 * })
 */
export async function traceAgent<T>(
  agentName: string,
  fn: (span: Span) => Promise<T>,
  metadata?: {
    eventType?: string
    eventId?: string
    tenantId?: string
  }
): Promise<T> {
  return traceAsync(
    `agent.${agentName}`,
    async (span) => {
      if (metadata) {
        span.setAttribute('agent.name', agentName)
        if (metadata.eventType) span.setAttribute('event.type', metadata.eventType)
        if (metadata.eventId) span.setAttribute('event.id', metadata.eventId)
        if (metadata.tenantId) span.setAttribute('tenant.id', metadata.tenantId)
      }
      return await fn(span)
    },
    { kind: 'internal' }
  )
}

/**
 * Trace an AI model call with token usage
 *
 * @example
 * const response = await traceAICall('openai-gpt4', async (span) => {
 *   const result = await openai.chat.completions.create({...})
 *   recordTokenUsage(result.usage)
 *   return result
 * })
 */
export async function traceAICall<T>(
  modelName: string,
  fn: (span: Span) => Promise<T>,
  metadata?: {
    provider?: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
): Promise<T> {
  return traceAsync(
    `ai.${modelName}`,
    async (span) => {
      span.setAttribute('ai.model', modelName)
      if (metadata?.provider) span.setAttribute('ai.provider', metadata.provider)
      if (metadata?.promptTokens) span.setAttribute('ai.tokens.prompt', metadata.promptTokens)
      if (metadata?.completionTokens)
        span.setAttribute('ai.tokens.completion', metadata.completionTokens)
      if (metadata?.totalTokens) span.setAttribute('ai.tokens.total', metadata.totalTokens)

      return await fn(span)
    },
    { kind: 'client' }
  )
}

/**
 * Helper to record token usage after an AI call
 */
export function recordTokenUsage(usage: {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}) {
  const span = trace.getActiveSpan()
  if (span) {
    span.setAttribute('ai.tokens.prompt', usage.prompt_tokens)
    span.setAttribute('ai.tokens.completion', usage.completion_tokens)
    span.setAttribute('ai.tokens.total', usage.total_tokens)
  }
}

/**
 * Trace a database query
 *
 * @example
 * const result = await traceDB('get-feedback-by-id', async (span) => {
 *   span.setAttribute('feedback_id', id)
 *   return await supabase.from('feedback').select('*').eq('id', id).single()
 * })
 */
export async function traceDB<T>(
  operation: string,
  fn: (span: Span) => Promise<T>,
  metadata?: {
    table?: string
    query?: string
  }
): Promise<T> {
  return traceAsync(
    `db.${operation}`,
    async (span) => {
      if (metadata?.table) span.setAttribute('db.table', metadata.table)
      if (metadata?.query) span.setAttribute('db.query', metadata.query)
      return await fn(span)
    },
    { kind: 'client' }
  )
}
