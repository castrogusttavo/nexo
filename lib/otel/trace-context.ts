import { trace } from '@opentelemetry/api'

/**
 * Stamps a log event with the trace and span it was written inside, using the
 * same field names the Axiom traces dataset uses (`trace_id`, `span_id`). That
 * is the whole link between the two: from a log line you filter the traces
 * dataset by its `trace_id`, from a span you filter the logs by it.
 *
 * Outside a span (a script, a log written before the SDK booted, an
 * unsampled request) the event is returned untouched.
 */
export function withTraceContext<T extends Record<string, unknown>>(
  event: T,
): T {
  const context = trace.getActiveSpan()?.spanContext()
  if (!context || !trace.isSpanContextValid(context)) return event
  return { ...event, trace_id: context.traceId, span_id: context.spanId }
}
