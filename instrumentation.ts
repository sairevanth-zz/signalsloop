/**
 * OpenTelemetry Instrumentation for SignalsLoop
 *
 * Note: OpenTelemetry auto-instrumentation is disabled for serverless (Vercel).
 * Use manual tracing from src/lib/observability/tracing.ts instead.
 *
 * For full auto-instrumentation, deploy to Node.js environments:
 * - Railway, Fly.io, or Docker
 */

export async function register() {
  // Disabled for serverless - manual tracing only
  // See src/lib/observability/tracing.ts for manual tracing helpers
}
