import type { Job } from 'bullmq'
import { describe, expect, it, vi } from 'vitest'

const { findUniqueMock, deleteMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: findUniqueMock, delete: deleteMock },
  },
}))
vi.mock('@/lib/axiom/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}))

import { processAccountLifecycle } from '@/src/lib/queue/processors/account-lifecycle'

function fakeJob(name: string, data: unknown, id = 'job-1'): Job {
  return { id, name, data } as unknown as Job
}

describe('processAccountLifecycle', () => {
  it('deletes the user when deletion is still scheduled', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      deletionScheduledAt: new Date('2026-06-01T00:00:00Z'),
    })
    deleteMock.mockResolvedValue({ id: 'user-1' })

    const result = await processAccountLifecycle(
      fakeJob('delete-account', { userId: 'user-1' }),
    )

    expect(result).toEqual({ status: 'deleted', userId: 'user-1' })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'user-1' } })
  })

  it('skips when user no longer exists', async () => {
    findUniqueMock.mockResolvedValue(null)

    const result = await processAccountLifecycle(
      fakeJob('delete-account', { userId: 'ghost' }),
    )

    expect(result).toEqual({
      status: 'skipped',
      userId: 'ghost',
      reason: 'user_not_found',
    })
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('skips when deletionScheduledAt was cleared (cancel race)', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      deletionScheduledAt: null,
    })

    const result = await processAccountLifecycle(
      fakeJob('delete-account', { userId: 'user-1' }),
    )

    expect(result).toEqual({
      status: 'skipped',
      userId: 'user-1',
      reason: 'deletion_canceled',
    })
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('throws on unknown job name', async () => {
    await expect(
      processAccountLifecycle(fakeJob('unknown', {})),
    ).rejects.toThrow(/Unknown account-lifecycle job/)
  })
})
