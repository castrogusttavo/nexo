import { type Job, UnrecoverableError } from 'bullmq'
import { describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'
import {
  JOB_EXHAUSTED_EVENT,
  reportJobFailure,
} from '@/src/lib/queue/failure-alarm'

const mockedLogger = vi.mocked(logger)

interface FakeJobInit {
  attemptsMade: number
  attempts?: number
  data?: unknown
}

// `attemptsMade` is what BullMQ reports when the worker emits `failed`: it has
// already been incremented for the attempt that just failed.
function fakeJob({
  attemptsMade,
  attempts,
  data = { userId: 'user-1' },
}: FakeJobInit): Job {
  return {
    id: 'job-42',
    name: 'delete-account',
    data,
    attemptsMade,
    opts: attempts === undefined ? {} : { attempts },
  } as unknown as Job
}

function exhaustedCalls() {
  return mockedLogger.error.mock.calls.filter(
    ([event]) => event === JOB_EXHAUSTED_EVENT,
  )
}

describe('reportJobFailure', () => {
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
