import pino from 'pino'

/**
 * Centralized Structured Logging for SignalsLoop
 *
 * Replaces console.log with structured JSON logs for:
 * - Centralized log aggregation (Datadog, LogDNA, etc.)
 * - Searchable, filterable logs
 * - Correlation with traces
 * - Production debugging
 *
 * Usage:
 *   logger.info('Processing feedback', { feedbackId, userId })
 *   logger.error('Failed to analyze sentiment', { error, feedbackId })
 *   logger.warn('High API usage detected', { tokens, cost })
 */

// Configure pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Production: JSON logs for aggregation
  // Development: Pretty-printed logs
  ...((process.env.NODE_ENV !== 'production' || process.env.PRETTY_LOGS === 'true') && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Base context added to all logs
  base: {
    service: 'signalsloop',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'apiKey',
      'api_key',
      'token',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'secret',
      '*.password',
      '*.apiKey',
      '*.token',
    ],
    remove: true,
  },

  // Serialize errors properly
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

/**
 * Create a child logger with additional context
 *
 * @example
 * const agentLogger = logger.child({ agent: 'sentiment-agent', tenantId })
 * agentLogger.info('Analyzing sentiment', { feedbackId })
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context)
}

/**
 * Logger for agent executions
 *
 * @example
 * const log = agentLogger('sentiment-agent', { tenantId, eventId })
 * log.info('Processing feedback', { feedbackId })
 */
export const agentLogger = (agentName: string, context?: Record<string, unknown>) => {
  return logger.child({
    component: 'agent',
    agent: agentName,
    ...context,
  })
}

/**
 * Logger for API routes
 *
 * @example
 * const log = apiLogger('/api/feedback/create', { userId, tenantId })
 * log.info('Creating feedback', { content: feedback })
 */
export const apiLogger = (route: string, context?: Record<string, unknown>) => {
  return logger.child({
    component: 'api',
    route,
    ...context,
  })
}

/**
 * Logger for database operations
 *
 * @example
 * const log = dbLogger('feedback', { operation: 'insert' })
 * log.debug('Inserting feedback', { feedbackId })
 */
export const dbLogger = (table: string, context?: Record<string, unknown>) => {
  return logger.child({
    component: 'database',
    table,
    ...context,
  })
}

/**
 * Logger for AI/ML operations
 *
 * @example
 * const log = aiLogger('openai-gpt4', { operation: 'completion' })
 * log.info('Generating completion', { promptTokens, completionTokens })
 */
export const aiLogger = (model: string, context?: Record<string, unknown>) => {
  return logger.child({
    component: 'ai',
    model,
    ...context,
  })
}

/**
 * Logger for cron jobs
 *
 * @example
 * const log = cronLogger('weekly-digest')
 * log.info('Starting weekly digest generation')
 */
export const cronLogger = (jobName: string, context?: Record<string, unknown>) => {
  return logger.child({
    component: 'cron',
    job: jobName,
    ...context,
  })
}

/**
 * Performance timing helper
 *
 * @example
 * const timer = startTimer('generate-spec')
 * // ... do work ...
 * timer.end({ themeId, specId }) // Logs duration automatically
 */
export const startTimer = (operation: string) => {
  const start = Date.now()

  return {
    end: (context?: Record<string, unknown>) => {
      const duration = Date.now() - start
      logger.info('Operation completed', {
        operation,
        duration_ms: duration,
        ...context,
      })
      return duration
    },
  }
}

/**
 * Track AI token usage
 *
 * @example
 * trackTokenUsage('openai-gpt4', {
 *   promptTokens: 500,
 *   completionTokens: 300,
 *   totalTokens: 800,
 *   operation: 'sentiment-analysis'
 * })
 */
export const trackTokenUsage = (
  model: string,
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    operation?: string
    cost?: number
  }
) => {
  aiLogger(model).info('Token usage', {
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
    total_tokens: usage.totalTokens,
    operation: usage.operation,
    estimated_cost: usage.cost,
  })
}

/**
 * Log errors with full context and stack traces
 *
 * @example
 * try {
 *   await processEvent(event)
 * } catch (error) {
 *   logError('Failed to process event', error, { eventId, eventType })
 * }
 */
export const logError = (message: string, error: unknown, context?: Record<string, unknown>) => {
  logger.error(
    {
      error,
      ...context,
    },
    message
  )
}

export default logger
