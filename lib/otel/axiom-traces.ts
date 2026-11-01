import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor, type SpanProcessor } from '@opentelemetry/sdk-trace'

/**
 * Request traces for Axiom, as a span processor Sentry's OpenTelemetry
 * provider runs.
 *
 * Sentry already installs the provider and the instrumentations (HTTP, fetch,
 * `pg`, Redis), so a second SDK would only fight it for the global tracer.
 * This adds an exporter beside Sentry's own: every sampled span is also sent
 * to the Axiom traces dataset, where the OpenTelemetry Traces dashboard and
 * its waterfall read it.
 *
 * Division of labour (see `lib/sentry/options.ts`): Axiom keeps the traces,
 * Sentry keeps the errors. `serverTracingOptions` drops the transactions
 * before they reach Sentry, so raising the sample rate here does not raise
 * what Sentry bills.
 */

const AXIOM_TRACES_URL = 'https://api.axiom.co/v1/traces'

export interface AxiomTracesConfig {
  token: string | undefined
  dataset: string
  sampleRate: number
}

export function axiomSpanProcessors(config: AxiomTracesConfig): SpanProcessor[] {
  if (!config.token) return []
  return [
    new BatchSpanProcessor({
      exporter: new OTLPTraceExporter({
        url: AXIOM_TRACES_URL,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'X-Axiom-Dataset': config.dataset,
        },
      }),
    }),
  ]
}

/**
 * The slice of `Sentry.init` options that turns the exporter on. Empty when no
 * token is configured, so a deployment without one keeps Sentry's own tracing
 * defaults untouched.
 */
export function serverTracingOptions(config: AxiomTracesConfig) {
  const openTelemetrySpanProcessors = axiomSpanProcessors(config)
  if (openTelemetrySpanProcessors.length === 0) return {}
  return {
    tracesSampleRate: config.sampleRate,
    openTelemetrySpanProcessors,
    // The traces live in Axiom. Sentry keeps receiving errors; a transaction
    // it never gets is one it never counts.
    beforeSendTransaction: () => null,
  }
}
