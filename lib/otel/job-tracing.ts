import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { resourceFromAttributes } from '@opentelemetry/resources'
import {
  ParentBasedSampler,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
  TracerProvider,
} from '@opentelemetry/sdk-trace'
import { type AxiomTracesConfig, axiomSpanProcessors } from './axiom-traces'

/**
 * One trace per background job.
 *
 * The worker is a bundled Node process outside Next, so Sentry's provider and
 * its auto-instrumentations are not there: nothing patches `pg` or `ioredis`
 * inside a bundle. What this gives instead is the span that matters first for
 * a slow or failing job -- how long it ran, on which queue, on which attempt,
 * and the exception when it threw -- plus `trace_id` on every log the job
 * writes (see `withTraceContext`).
 *
 * With no Axiom traces token `wrap` returns the processor untouched.
 */

export interface TracedJob {
  id?: string
  name: string
  attemptsMade: number
}

export interface JobTracing {
  wrap<J extends TracedJob, R>(
    queue: string,
    processor: (job: J) => Promise<R>,
  ): (job: J) => Promise<R>
  /** Flush what is buffered; call it before the process exits. */
  shutdown(): Promise<void>
}

const NOOP: JobTracing = {
  wrap: (_queue, processor) => processor,
  shutdown: async () => {},
}

/** Makes the active span visible to code running under `context.with`. */
export function installJobContext(): void {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
}

export function createJobTracing(
  config: AxiomTracesConfig,
  serviceName = 'nexo-worker',
  processors: SpanProcessor[] = axiomSpanProcessors(config),
): JobTracing {
  if (processors.length === 0) return NOOP

  const provider = new TracerProvider({
    resource: resourceFromAttributes({ 'service.name': serviceName }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(config.sampleRate),
    }),
    spanProcessors: processors,
  })
  const tracer = provider.getTracer('nexo-worker')

  return {
    wrap: (queue, processor) => async (job) => {
      const span = tracer.startSpan(`${queue} process`, {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination.name': queue,
          'messaging.message.id': job.id,
          'bullmq.job.name': job.name,
          'bullmq.job.attempt': job.attemptsMade + 1,
        },
      })
      try {
        return await context.with(trace.setSpan(context.active(), span), () =>
          processor(job),
        )
      } catch (error) {
        span.recordException(error as Error)
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        })
        throw error
      } finally {
        span.end()
      }
    },
    shutdown: () => provider.shutdown(),
  }
}
