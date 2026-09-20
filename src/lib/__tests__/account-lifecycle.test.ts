import { beforeEach, describe, expect, it, vi } from 'vitest'

// The mocks mirror BullMQ v5: getJob() resolves with undefined for an
// unknown id, and remove() resolves with 1 whenever the job is not locked
// (existing or not) and 0 when a worker holds the lock — it never throws
// for a missing job.
const { addMock, removeMock, getJobMock } = vi.hoisted(() => ({
  addMock: vi.fn().mockResolvedValue(undefined),
  removeMock: vi.fn().mockResolvedValue(1),
  getJobMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/src/lib/queue/queues', () => ({
  getAccountLifecycleQueue: () => ({
    add: addMock,
    remove: removeMock,
    getJob: getJobMock,
  }),
}))

import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACCOUNT_DELETION_GRACE_MS,
  cancelAccountDeletion,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'

/** A pending delete-account job, as getJob() would hand it back. */
function pendingJob(jobId: string) {
  return { id: jobId, name: 'delete-account', data: { userId: 'user-1' } }
}

describe('account-lifecycle queue helpers', () => {
  beforeEach(() => {
    addMock.mockClear()
    removeMock.mockClear()
    getJobMock.mockClear()
    removeMock.mockResolvedValue(1)
    getJobMock.mockResolvedValue(undefined)
  })

  it('exposes a 30-day grace window', () => {
    expect(ACCOUNT_DELETION_GRACE_DAYS).toBe(30)
    expect(ACCOUNT_DELETION_GRACE_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('schedules a delayed delete-account job with deterministic jobId', async () => {
    const scheduledAt = new Date(Date.now() + 1000)

    await scheduleAccountDeletion('user-1', scheduledAt)

    expect(addMock).toHaveBeenCalledTimes(1)
    const [jobName, payload, opts] = addMock.mock.calls[0]
    expect(jobName).toBe('delete-account')
    expect(payload).toEqual({ userId: 'user-1' })
    expect(opts.jobId).toBe('delete-account-user-1')
    expect(opts.jobId).not.toContain(':')
    expect(opts.delay).toBeGreaterThanOrEqual(0)
  })

  it('clamps negative delays to 0', async () => {
    const scheduledAt = new Date(Date.now() - 1_000_000)

    await scheduleAccountDeletion('user-1', scheduledAt)

    const opts = addMock.mock.calls[0][2]
    expect(opts.delay).toBe(0)
  })

  it('drops the pending job before scheduling so a new deadline wins', async () => {
    getJobMock.mockResolvedValue(pendingJob('delete-account-user-1'))

    await scheduleAccountDeletion('user-1', new Date(Date.now() + 60_000))

    expect(removeMock).toHaveBeenCalledWith('delete-account-user-1')
    expect(addMock).toHaveBeenCalledTimes(1)
    // The remove has to land before the add, or BullMQ keeps the old job.
    expect(removeMock.mock.invocationCallOrder[0]).toBeLessThan(
      addMock.mock.invocationCallOrder[0],
    )
  })

  it('does not remove anything when the user has no job queued', async () => {
    await scheduleAccountDeletion('user-1', new Date(Date.now() + 60_000))

    expect(removeMock).not.toHaveBeenCalled()
    expect(addMock).toHaveBeenCalledTimes(1)
  })

  it('still schedules when the pre-emptive remove fails', async () => {
    getJobMock.mockResolvedValue(pendingJob('delete-account-user-1'))
    removeMock.mockRejectedValueOnce(new Error('redis down'))

    await scheduleAccountDeletion('user-1', new Date(Date.now() + 60_000))

    expect(addMock).toHaveBeenCalledTimes(1)
  })

  it('cancels by deterministic jobId and reports the removal', async () => {
    getJobMock.mockResolvedValue(pendingJob('delete-account-user-1'))

    const ok = await cancelAccountDeletion('user-1')

    expect(getJobMock).toHaveBeenCalledWith('delete-account-user-1')
    expect(removeMock).toHaveBeenCalledWith('delete-account-user-1')
    expect(ok).toBe(true)
  })

  it('returns false when there was nothing scheduled to cancel', async () => {
    // BullMQ's remove() would answer 1 here even though no job existed, so
    // the helper must not take that as a cancellation.
    const ok = await cancelAccountDeletion('user-1')

    expect(ok).toBe(false)
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('returns false when the job is locked by a running worker', async () => {
    getJobMock.mockResolvedValue(pendingJob('delete-account-user-1'))
    removeMock.mockResolvedValue(0)

    const ok = await cancelAccountDeletion('user-1')

    expect(ok).toBe(false)
  })

  it('returns false when remove throws', async () => {
    getJobMock.mockResolvedValue(pendingJob('delete-account-user-1'))
    removeMock.mockRejectedValueOnce(new Error('redis down'))

    const ok = await cancelAccountDeletion('user-1')

    expect(ok).toBe(false)
  })
})
