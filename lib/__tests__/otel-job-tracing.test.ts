import { SpanStatusCode } from '@opentelemetry/api'
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace'
import { describe, expect, it } from 'vitest'
import { createJobTracing } from '@/lib/otel/job-tracing'

const config = { token: 'xaat-test', dataset: 'nexo-traces', sampleRate: 1 }
const job = { id: '7', name: 'sweep', attemptsMade: 1 }

function setup() {
  const exporter = new InMemorySpanExporter()
  const tracing = createJobTracing(config, 'nexo-worker', [
    new SimpleSpanProcessor({ exporter }),
  ])
  return { exporter, tracing }
}

describe('createJobTracing', () => {
  it('returns the processor untouched when no exporter is configured', () => {
    const processor = async () => 'done'
    const tracing = createJobTracing({ ...config, token: undefined })
    expect(tracing.wrap('data-retention', processor)).toBe(processor)
  })

  it('records one consumer span per job with queue, job and attempt', async () => {
    const { exporter, tracing } = setup()
    const run = tracing.wrap('data-retention', async () => 'ok')

    await expect(run(job)).resolves.toBe('ok')

    const [span] = exporter.getFinishedSpans()
    expect(span.name).toBe('data-retention process')
    expect(span.attributes).toMatchObject({
      'messaging.system': 'bullmq',
      'messaging.destination.name': 'data-retention',
      'bullmq.job.name': 'sweep',
      'bullmq.job.attempt': 2,
    })
    expect(span.status.code).not.toBe(SpanStatusCode.ERROR)
  })

  it('marks the span as an error, keeps the exception and rethrows', async () => {
    const { exporter, tracing } = setup()
    const run = tracing.wrap('data-export', async () => {
      throw new Error('boom')
    })

    await expect(run(job)).rejects.toThrow('boom')

    const [span] = exporter.getFinishedSpans()
    expect(span.status).toMatchObject({
      code: SpanStatusCode.ERROR,
      message: 'boom',
    })
    expect(span.events.map((e) => e.name)).toContain('exception')
  })
})
