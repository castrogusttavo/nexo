import { describe, expect, it, vi } from 'vitest'

const { addMock, removeMock } = vi.hoisted(() => ({
  addMock: vi.fn().mockResolvedValue(undefined),
  removeMock: vi.fn().mockResolvedValue(1),
}))

vi.mock('@/src/lib/queue/queues', () => ({
  getAccountLifecycleQueue: () => ({ add: addMock, remove: removeMock }),
}))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}))

import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACCOUNT_DELETION_GRACE_MS,
  cancelAccountDeletion,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'

describe('account-lifecycle queue helpers', () => {
  it('exposes a 30-day grace window', () => {
    expect(ACCOUNT_DELETION_GRACE_DAYS).toBe(30)
    expect(ACCOUNT_DELETION_GRACE_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('schedules a delayed delete-account job with deterministic jobId', async () => {
    addMock.mockClear()
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
    addMock.mockClear()
    const scheduledAt = new Date(Date.now() - 1_000_000)

    await scheduleAccountDeletion('user-1', scheduledAt)

    const opts = addMock.mock.calls[0][2]
    expect(opts.delay).toBe(0)
  })

  it('cancels by deterministic jobId', async () => {
    removeMock.mockClear()
    const ok = await cancelAccountDeletion('user-1')

    expect(removeMock).toHaveBeenCalledWith('delete-account-user-1')
    expect(ok).toBe(true)
  })

  it('returns false when remove throws', async () => {
    removeMock.mockRejectedValueOnce(new Error('not found'))

    const ok = await cancelAccountDeletion('user-1')

    expect(ok).toBe(false)
  })
})
