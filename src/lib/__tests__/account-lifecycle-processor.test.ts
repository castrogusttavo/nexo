import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/cache/user.cache')
vi.mock('@/src/repositories/user.repository')

import { UserCache } from '@/src/cache/user.cache'
import { processAccountLifecycle } from '@/src/lib/queue/processors/account-lifecycle'
import { UserRepository } from '@/src/repositories/user.repository'

const mockedUser = vi.mocked(UserRepository)
const mockedUserCache = vi.mocked(UserCache)

function fakeJob(name: string, data: unknown, id = 'job-1'): Job {
  return { id, name, data } as unknown as Job
}

describe('processAccountLifecycle', () => {
  beforeEach(() => {
    mockedUserCache.invalidate.mockResolvedValue(undefined)
  })

  it('deletes the user when deletion is still scheduled', async () => {
    const user = createFakeUser({
      id: 'user-1',
      deletionScheduledAt: new Date('2026-06-01T00:00:00Z'),
    })
    mockedUser.findById.mockResolvedValue(ok(user))
    mockedUser.deleteHard.mockResolvedValue(ok(true))

    const result = await processAccountLifecycle(
      fakeJob('delete-account', { userId: 'user-1' }),
    )

    expect(result).toEqual({ status: 'deleted', userId: 'user-1' })
    expect(mockedUser.deleteHard).toHaveBeenCalledWith('user-1')
    expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
  })

  it('skips when user no longer exists', async () => {
    mockedUser.findById.mockResolvedValue(err(notFound('User')))

    const result = await processAccountLifecycle(
      fakeJob('delete-account', { userId: 'ghost' }),
    )

    expect(result).toEqual({
      status: 'skipped',
      userId: 'ghost',
      reason: 'user_not_found',
    })
    expect(mockedUser.deleteHard).not.toHaveBeenCalled()
  })

  it('skips when deletionScheduledAt was cleared (cancel race)', async () => {
    const user = createFakeUser({ id: 'user-1', deletionScheduledAt: null })
    mockedUser.findById.mockResolvedValue(ok(user))

    const result = await processAccountLifecycle(
      fakeJob('delete-account', { userId: 'user-1' }),
    )

    expect(result).toEqual({
      status: 'skipped',
      userId: 'user-1',
      reason: 'deletion_canceled',
    })
    expect(mockedUser.deleteHard).not.toHaveBeenCalled()
  })

  it('throws on unknown job name', async () => {
    await expect(
      processAccountLifecycle(fakeJob('unknown', {})),
    ).rejects.toThrow(/Unknown account-lifecycle job/)
  })
})
