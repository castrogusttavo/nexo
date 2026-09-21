import { type Job, UnrecoverableError } from 'bullmq'
import { describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'
import {
  createJobFailureAlarm,
  JOB_EXHAUSTED_EVENT,
  JOB_STALLED_EVENT,
  STALLED_FAILURE_REASON,
} from '@/src/lib/queue/failure-alarm'

const mockedLogger = vi.mocked(logger)

interface FakeJobInit {
  attemptsMade: number
  attempts?: number
  data?: unknown
  id?: string
  finishedOn?: number
  stacktrace?: string[]
}

// `attemptsMade` is what BullMQ reports when the worker emits `failed`: it has
// already been incremented for the attempt that just failed.
function fakeJob({
  attemptsMade,
  attempts,
  data = { userId: 'user-1' },
  id = 'job-42',
  finishedOn,
  stacktrace = [],
}: FakeJobInit): Job {
  return {
    id,
    name: 'delete-account',
    data,
    attemptsMade,
    finishedOn,
    stacktrace,
    opts: attempts === undefined ? {} : { attempts },
  } as unknown as Job
}

// Each test gets its own alarm: the dedup ledger is per instance, and a
// module-level one would leak deaths between tests.
function reportJobFailure(queue: string, job: Job | undefined, error: Error) {
  createJobFailureAlarm().workerFailed(queue, job, error)
}

// What BullMQ 5.x throws on the pickup after a job exceeded maxStalledCount:
// the stall checker stored the reason as a deferred failure, and the Worker
// turns it into an UnrecoverableError without running the processor.
function stallVerdict(): Error {
  return new UnrecoverableError(STALLED_FAILURE_REASON)
}

function exhaustedCalls() {
  return mockedLogger.error.mock.calls.filter(
    ([event]) => event === JOB_EXHAUSTED_EVENT,
  )
}

describe('job failure alarm -- Worker failed event', () => {
  it('uses a stable event name an Axiom monitor can key on', () => {
    expect(JOB_EXHAUSTED_EVENT).toBe('queue.job.exhausted')
  })

  it('alarms exactly once, with the full field set, when the last attempt fails', () => {
    const error = new Error('Foreign key constraint violated')

    reportJobFailure(
      'account-lifecycle',
      fakeJob({ attemptsMade: 3, attempts: 3 }),
      error,
    )

    const calls = exhaustedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toEqual({
      component: 'Worker',
      queue: 'account-lifecycle',
      jobName: 'delete-account',
      jobId: 'job-42',
      attemptsMade: 3,
      maxAttempts: 3,
      reason: 'attempts_exhausted',
      message: 'Foreign key constraint violated',
      stack: error.stack,
      payload: { userId: 'user-1' },
    })
  })

  it('does not alarm when the failure will still be retried', () => {
    const job = fakeJob({ attemptsMade: 1, attempts: 3 })
    reportJobFailure('account-lifecycle', job, new Error('boom'))
    reportJobFailure(
      'account-lifecycle',
      fakeJob({ attemptsMade: 2, attempts: 3 }),
      new Error('boom'),
    )

    expect(exhaustedCalls()).toHaveLength(0)
  })

  it('still logs every individual attempt failure, flagging whether it retries', () => {
    reportJobFailure(
      'account-lifecycle',
      fakeJob({ attemptsMade: 2, attempts: 3 }),
      new Error('boom'),
    )

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'queue.job.failed',
      expect.objectContaining({
        queue: 'account-lifecycle',
        attemptsMade: 2,
        willRetry: true,
      }),
    )
  })

  it('alarms on the first failure of a job with a single attempt', () => {
    reportJobFailure(
      'data-export',
      fakeJob({ attemptsMade: 1, attempts: 1 }),
      new Error('boom'),
    )

    expect(exhaustedCalls()).toHaveLength(1)
  })

  it('treats a job without an attempts option as single-attempt', () => {
    reportJobFailure(
      'data-export',
      fakeJob({ attemptsMade: 1, attempts: undefined }),
      new Error('boom'),
    )

    expect(exhaustedCalls()).toHaveLength(1)
  })

  it('alarms on an UnrecoverableError even with attempts left, since BullMQ will not retry it', () => {
    reportJobFailure(
      'account-lifecycle',
      fakeJob({ attemptsMade: 1, attempts: 3 }),
      new UnrecoverableError('bad payload'),
    )

    const calls = exhaustedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toMatchObject({ reason: 'unrecoverable' })
  })

  it('never logs payload fields outside the identifier allowlist', () => {
    const data = {
      userId: 'user-1',
      workspaceId: 'ws-1',
      token: 'secret-reset-token',
      password: 'hunter2',
      apiKey: 'sk_live_123',
      email: 'someone@example.com',
      nested: { userId: 'smuggled' },
    }

    reportJobFailure(
      'account-lifecycle',
      fakeJob({ attemptsMade: 3, attempts: 3, data }),
      new Error('boom'),
    )

    const serialized = JSON.stringify(mockedLogger.error.mock.calls)
    expect(serialized).not.toContain('secret-reset-token')
    expect(serialized).not.toContain('hunter2')
    expect(serialized).not.toContain('sk_live_123')
    expect(serialized).not.toContain('someone@example.com')
    expect(serialized).not.toContain('smuggled')
    expect(exhaustedCalls()[0][1]).toMatchObject({
      payload: { userId: 'user-1', workspaceId: 'ws-1' },
    })
  })

  it('omits the payload field when the job carries no allowlisted identifier', () => {
    reportJobFailure(
      'data-retention',
      fakeJob({ attemptsMade: 3, attempts: 3, data: {} }),
      new Error('boom'),
    )

    expect(exhaustedCalls()[0][1]).not.toHaveProperty('payload')
  })

  it('logs the failure without alarming when BullMQ hands over no job', () => {
    reportJobFailure('data-export', undefined, new Error('lock lost'))

    expect(exhaustedCalls()).toHaveLength(0)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'queue.job.failed',
      expect.objectContaining({ queue: 'data-export', message: 'lock lost' }),
    )
  })
})

describe('job failure alarm -- stalls', () => {
  it('alarms once with reason stalled when a stall exhausts maxStalledCount', () => {
    const alarm = createJobFailureAlarm()
    const job = fakeJob({ attemptsMade: 1, attempts: 3, finishedOn: 1000 })

    alarm.workerFailed('account-lifecycle', job, stallVerdict())

    const calls = exhaustedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toMatchObject({
      queue: 'account-lifecycle',
      jobId: 'job-42',
      reason: 'stalled',
      message: STALLED_FAILURE_REASON,
      payload: { userId: 'user-1' },
    })
  })

  it('only warns, never alarms, on a stall BullMQ will retry', () => {
    const alarm = createJobFailureAlarm()

    alarm.stalled('data-export', 'job-7')

    expect(exhaustedCalls()).toHaveLength(0)
    expect(mockedLogger.error).not.toHaveBeenCalled()
    expect(mockedLogger.warn).toHaveBeenCalledWith(JOB_STALLED_EVENT, {
      component: 'Worker',
      queue: 'data-export',
      jobId: 'job-7',
    })
  })

  it('classifies a stall death seen only by QueueEvents as stalled', () => {
    const alarm = createJobFailureAlarm()
    const job = fakeJob({
      attemptsMade: 1,
      attempts: 3,
      finishedOn: 1000,
      stacktrace: ['UnrecoverableError: job stalled more than allowable limit'],
    })

    alarm.queueEventFailed(
      'account-lifecycle',
      'job-42',
      STALLED_FAILURE_REASON,
      job,
    )

    const calls = exhaustedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toEqual({
      component: 'Worker',
      queue: 'account-lifecycle',
      jobName: 'delete-account',
      jobId: 'job-42',
      attemptsMade: 1,
      maxAttempts: 3,
      reason: 'stalled',
      message: STALLED_FAILURE_REASON,
      stack: 'UnrecoverableError: job stalled more than allowable limit',
      payload: { userId: 'user-1' },
    })
  })
})

describe('job failure alarm -- one death, two witnesses', () => {
  const death = () =>
    fakeJob({ attemptsMade: 3, attempts: 3, finishedOn: 1000 })

  it('alarms once when the Worker reports first and QueueEvents second', () => {
    const alarm = createJobFailureAlarm()

    alarm.workerFailed('account-lifecycle', death(), new Error('boom'))
    alarm.queueEventFailed('account-lifecycle', 'job-42', 'boom', death())

    expect(exhaustedCalls()).toHaveLength(1)
    expect(exhaustedCalls()[0][1]).toMatchObject({
      reason: 'attempts_exhausted',
    })
  })

  it('alarms once when QueueEvents reports first and the Worker second', () => {
    const alarm = createJobFailureAlarm()

    alarm.queueEventFailed('account-lifecycle', 'job-42', 'boom', death())
    alarm.workerFailed('account-lifecycle', death(), new Error('boom'))

    expect(exhaustedCalls()).toHaveLength(1)
  })

  it('alarms once for a stall death seen by both paths', () => {
    const alarm = createJobFailureAlarm()
    const job = fakeJob({ attemptsMade: 1, attempts: 3, finishedOn: 1000 })

    alarm.workerFailed('account-lifecycle', job, stallVerdict())
    alarm.queueEventFailed(
      'account-lifecycle',
      'job-42',
      STALLED_FAILURE_REASON,
      job,
    )

    expect(exhaustedCalls()).toHaveLength(1)
    expect(exhaustedCalls()[0][1]).toMatchObject({ reason: 'stalled' })
  })

  it('still alarms when QueueEvents is the only witness', () => {
    const alarm = createJobFailureAlarm()

    alarm.queueEventFailed('data-export', 'job-42', 'boom', death())

    expect(exhaustedCalls()).toHaveLength(1)
  })

  it('does not merge the same death reported on two different queues', () => {
    const alarm = createJobFailureAlarm()

    alarm.workerFailed('data-export', death(), new Error('boom'))
    alarm.workerFailed('account-lifecycle', death(), new Error('boom'))

    expect(exhaustedCalls()).toHaveLength(2)
  })

  it('alarms again when a job retried by hand dies a second time', () => {
    const alarm = createJobFailureAlarm()

    alarm.workerFailed(
      'account-lifecycle',
      fakeJob({ attemptsMade: 3, attempts: 3, finishedOn: 1000 }),
      new Error('boom'),
    )
    alarm.workerFailed(
      'account-lifecycle',
      fakeJob({ attemptsMade: 3, attempts: 3, finishedOn: 9000 }),
      new Error('boom'),
    )

    expect(exhaustedCalls()).toHaveLength(2)
  })

  it('alarms once when the job was gone before QueueEvents could read it', () => {
    const alarm = createJobFailureAlarm()

    alarm.workerFailed('account-lifecycle', death(), new Error('boom'))
    alarm.queueEventFailed('account-lifecycle', 'job-42', 'boom', undefined)
    expect(exhaustedCalls()).toHaveLength(1)

    alarm.queueEventFailed('data-export', 'job-9', 'boom', undefined)
    expect(exhaustedCalls()).toHaveLength(2)
    expect(exhaustedCalls()[1][1]).toMatchObject({
      queue: 'data-export',
      jobId: 'job-9',
      jobName: 'unknown',
      message: 'boom',
    })
  })

  it('classifies a QueueEvents death with attempts left as unrecoverable', () => {
    const alarm = createJobFailureAlarm()

    alarm.queueEventFailed(
      'account-lifecycle',
      'job-42',
      'bad payload',
      fakeJob({ attemptsMade: 1, attempts: 3, finishedOn: 1000 }),
    )

    expect(exhaustedCalls()[0][1]).toMatchObject({ reason: 'unrecoverable' })
  })

  it('keeps the dedup ledger bounded', () => {
    const alarm = createJobFailureAlarm({ capacity: 3 })

    for (let i = 0; i < 10; i++) {
      alarm.workerFailed(
        'data-export',
        fakeJob({
          attemptsMade: 3,
          attempts: 3,
          id: `job-${i}`,
          finishedOn: i,
        }),
        new Error('boom'),
      )
    }

    expect(alarm.ledgerSize).toBe(3)
    expect(exhaustedCalls()).toHaveLength(10)
    // The most recent deaths are still deduplicated.
    alarm.queueEventFailed(
      'data-export',
      'job-9',
      'boom',
      fakeJob({ attemptsMade: 3, attempts: 3, id: 'job-9', finishedOn: 9 }),
    )
    expect(exhaustedCalls()).toHaveLength(10)
  })
})
