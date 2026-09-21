import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'

// A stand-in QueueEvents: records its construction and lets a test emit the
// `failed` events BullMQ would read off the queue's event stream. Hoisted so
// the bullmq mock factory can reference it.
const { created, FakeQueueEvents } = vi.hoisted(() => {
  const { EventEmitter } =
    require('node:events') as typeof import('node:events')
  const created: InstanceType<typeof FakeQueueEvents>[] = []
  class FakeQueueEvents extends EventEmitter {
    constructor(
      readonly name: string,
      readonly opts: unknown,
    ) {
      super()
      created.push(this)
    }
    close = vi.fn(async () => {})
  }
  return { created, FakeQueueEvents }
})

vi.mock('bullmq', async (importOriginal) => ({
  ...(await importOriginal<typeof import('bullmq')>()),
  QueueEvents: FakeQueueEvents,
}))

vi.mock('@/src/lib/queue/queues', () => ({ getQueueByName: vi.fn() }))

import {
  createJobFailureAlarm,
  JOB_EXHAUSTED_EVENT,
  STALLED_FAILURE_REASON,
} from '@/src/lib/queue/failure-alarm'
import { startJobFailureListener } from '@/src/lib/queue/failure-listener'
import { QueueName } from '@/src/lib/queue/jobs'

const mockedLogger = vi.mocked(logger)

function exhaustedCalls() {
  return mockedLogger.error.mock.calls.filter(
    ([event]) => event === JOB_EXHAUSTED_EVENT,
  )
}

function deadJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    name: 'delete-account',
    data: { userId: 'user-1' },
    attemptsMade: 1,
    finishedOn: 1000,
    stacktrace: [],
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job
}

const connection = { host: 'redis.test' }

beforeEach(() => {
  created.length = 0
})

describe('startJobFailureListener', () => {
  it('opens one QueueEvents per queue on the given connection', () => {
    startJobFailureListener(
      [QueueName.AccountLifecycle, QueueName.DataExport],
      { alarm: createJobFailureAlarm(), connection, loadJob: vi.fn() },
    )

    expect(created.map((events) => events.name)).toEqual([
      QueueName.AccountLifecycle,
      QueueName.DataExport,
    ])
    expect(created[0].opts).toEqual({ connection })
  })

  it('alarms once, as stalled, when a stall-exhausted job reaches the failed set', async () => {
    const loadJob = vi.fn(async () => deadJob())
    const listener = startJobFailureListener([QueueName.AccountLifecycle], {
      alarm: createJobFailureAlarm(),
      connection,
      loadJob,
    })

    created[0].emit('failed', {
      jobId: 'job-1',
      failedReason: STALLED_FAILURE_REASON,
    })
    await listener.close()

    expect(loadJob).toHaveBeenCalledWith(QueueName.AccountLifecycle, 'job-1')
    expect(exhaustedCalls()).toHaveLength(1)
    expect(exhaustedCalls()[0][1]).toMatchObject({
      queue: QueueName.AccountLifecycle,
      jobId: 'job-1',
      reason: 'stalled',
      payload: { userId: 'user-1' },
    })
  })

  it('alarms once when the Worker already reported the same death', async () => {
    const alarm = createJobFailureAlarm()
    const job = deadJob({ attemptsMade: 3 })
    const listener = startJobFailureListener([QueueName.AccountLifecycle], {
      alarm,
      connection,
      loadJob: async () => job,
    })

    alarm.workerFailed(QueueName.AccountLifecycle, job, new Error('boom'))
    created[0].emit('failed', { jobId: 'job-1', failedReason: 'boom' })
    await listener.close()

    expect(exhaustedCalls()).toHaveLength(1)
  })

  it('still alarms when the job cannot be read back', async () => {
    const listener = startJobFailureListener([QueueName.DataExport], {
      alarm: createJobFailureAlarm(),
      connection,
      loadJob: async () => {
        throw new Error('connection reset')
      },
    })

    created[0].emit('failed', { jobId: 'job-9', failedReason: 'boom' })
    await listener.close()

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'queue.events.lookup_error',
      expect.objectContaining({ jobId: 'job-9', message: 'connection reset' }),
    )
    expect(exhaustedCalls()).toHaveLength(1)
  })

  it('logs QueueEvents errors instead of crashing the process', () => {
    startJobFailureListener([QueueName.DataExport], {
      alarm: createJobFailureAlarm(),
      connection,
      loadJob: vi.fn(),
    })

    created[0].emit('error', new Error('READONLY'))

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'queue.events.error',
      expect.objectContaining({
        queue: QueueName.DataExport,
        message: 'READONLY',
      }),
    )
  })

  it('closes every QueueEvents and drains in-flight reports on close', async () => {
    let release: (job: Job) => void = () => {}
    const listener = startJobFailureListener(
      [QueueName.AccountLifecycle, QueueName.DataExport],
      {
        alarm: createJobFailureAlarm(),
        connection,
        loadJob: () =>
          new Promise<Job>((resolve) => {
            release = resolve
          }),
      },
    )

    created[0].emit('failed', { jobId: 'job-1', failedReason: 'boom' })
    const closing = listener.close()
    let closed = false
    void closing.then(() => {
      closed = true
    })
    await Promise.resolve()

    expect(
      created.every((events) => events.close.mock.calls.length === 1),
    ).toBe(true)
    expect(closed).toBe(false)

    release(deadJob())
    await closing

    expect(exhaustedCalls()).toHaveLength(1)
  })
})
