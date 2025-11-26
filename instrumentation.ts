import { registerOTel } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

/**
 * OpenTelemetry Instrumentation for SignalsLoop
 *
 * This sets up distributed tracing for:
 * - HTTP requests
 * - Database queries (Postgres)
 * - AI agent workflows
 * - API routes
 *
 * Export traces to your observability platform via OTEL_EXPORTER_OTLP_ENDPOINT
 */

export async function register() {
  // Only enable in production or when explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_TRACING !== 'true') {
    console.log('[OpenTelemetry] Tracing disabled in development')
    return
  }

  // Configure the trace exporter endpoint
  // Set OTEL_EXPORTER_OTLP_ENDPOINT in your environment (e.g., Datadog, Honeycomb, Jaeger)
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {
      // Add authentication headers for your observability platform
      ...(process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {}),
    },
  })

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'signalsloop',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Fine-tune auto-instrumentation
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable filesystem tracing (too noisy)
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingPaths: ['/api/health', '/_next', '/favicon.ico'],
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true, // Trace Postgres queries
        },
      }),
    ],
  })

  try {
    sdk.start()
    console.log('[OpenTelemetry] Tracing initialized successfully')

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('[OpenTelemetry] Tracing terminated'))
        .catch((error) => console.error('[OpenTelemetry] Error terminating tracing', error))
        .finally(() => process.exit(0))
    })
  } catch (error) {
    console.error('[OpenTelemetry] Failed to initialize tracing:', error)
  }
}
