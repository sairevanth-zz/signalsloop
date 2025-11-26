/**
 * OpenTelemetry Instrumentation for SignalsLoop
 *
 * Note: Full OpenTelemetry auto-instrumentation doesn't work in Vercel serverless.
 * Use manual tracing with src/lib/observability/tracing.ts instead.
 *
 * For full tracing with auto-instrumentation, deploy to:
 * - Railway (Node.js runtime)
 * - Fly.io (Node.js runtime)
 * - Self-hosted with Docker
 */

export async function register() {
  // Only enable in production when explicitly requested
  if (process.env.ENABLE_TRACING !== 'true') {
    return
  }

  // Check if we're in a serverless environment (Vercel)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log('[OpenTelemetry] Auto-instrumentation not supported in serverless')
    console.log('[OpenTelemetry] Use manual tracing from src/lib/observability/tracing.ts')
    return
  }

  // Only attempt to load OpenTelemetry in Node.js environments
  try {
    // Dynamic import to avoid bundling issues
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
    const { Resource } = await import('@opentelemetry/resources')
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = await import(
      '@opentelemetry/semantic-conventions'
    )
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')

    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {},
    })

    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: 'signalsloop',
        [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingPaths: ['/api/health', '/_next', '/favicon.ico'],
          },
          '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
      ],
    })

    sdk.start()
    console.log('[OpenTelemetry] Auto-instrumentation started')

    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('[OpenTelemetry] Shutdown complete'))
        .catch((error) => console.error('[OpenTelemetry] Error during shutdown', error))
        .finally(() => process.exit(0))
    })
  } catch (error) {
    console.warn('[OpenTelemetry] Auto-instrumentation not available:', error)
    console.log('[OpenTelemetry] Use manual tracing from src/lib/observability/tracing.ts')
  }
}
