import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, notFound } from '@/src/errors'
import { rateLimited } from '@/src/errors/app-error'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/cache/user.cache')
vi.mock('@/src/lib/queue/account-lifecycle', () => ({
  ACCOUNT_DELETION_GRACE_MS: 30 * 24 * 60 * 60 * 1000,
  getAccountDeletionGraceMs: () => 30 * 24 * 60 * 60 * 1000,
  scheduleAccountDeletion: vi.fn(),
  cancelAccountDeletion: vi.fn(),
}))
vi.mock('@/src/lib/queue/data-export', () => ({
  enqueueUserExport: vi.fn(),
}))
vi.mock('@/src/lib/rate-limit', () => ({
  consume: vi.fn(),
  exportLimiter: { __mock: 'export' },
}))
vi.mock('@/src/lib/mail/user/send-delete-account', () => ({
  sendDeleteAccountEmail: vi.fn(),
}))

import { UserCache } from '@/src/cache/user.cache'
import { sendDeleteAccountEmail } from '@/src/lib/mail/user/send-delete-account'
import {
  cancelAccountDeletion,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'
import { enqueueUserExport } from '@/src/lib/queue/data-export'
import { consume } from '@/src/lib/rate-limit'
import { UserRepository } from '@/src/repositories/user.repository'
import { AccountLifecycleService } from '@/src/services/account-lifecycle.service'

const mockedUser = vi.mocked(UserRepository)
const mockedUserCache = vi.mocked(UserCache)
const mockedScheduleDeletion = vi.mocked(scheduleAccountDeletion)
const mockedCancelDeletion = vi.mocked(cancelAccountDeletion)
const mockedSendEmail = vi.mocked(sendDeleteAccountEmail)
const mockedEnqueueExport = vi.mocked(enqueueUserExport)
const mockedConsume = vi.mocked(consume)

describe('AccountLifecycleService', () => {
  describe('deleteAccount()', () => {
    beforeEach(() => {
      mockedScheduleDeletion.mockResolvedValue(undefined)
      mockedSendEmail.mockResolvedValue({ id: 'email-id' })
      mockedUser.deleteAllSessions.mockResolvedValue(ok(undefined))
      mockedUserCache.invalidate.mockResolvedValue(undefined)
    })

    it('schedules deletion, revokes sessions, invalidates cache, sends email', async () => {
      const user = createFakeUser({ id: 'user-1', email: 'me@example.com' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(ok(0))
      mockedUser.scheduleDeletion.mockImplementation(async (_id, at) =>
        ok({ ...user, deletionScheduledAt: at }),
      )

      const result = await AccountLifecycleService.deleteAccount('user-1')

      const value = expectOk(result)
      expect(typeof value.scheduledAt).toBe('string')
      expect(mockedUser.scheduleDeletion).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
      )
      expect(mockedScheduleDeletion).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
      )
      expect(mockedUser.deleteAllSessions).toHaveBeenCalledWith('user-1')
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'me@example.com' }),
      )
    })

    it('is idempotent when deletion already scheduled', async () => {
      const existingDate = new Date('2026-06-01T12:00:00Z')
      const user = createFakeUser({
        id: 'user-1',
        deletionScheduledAt: existingDate,
      })
      mockedUser.findById.mockResolvedValue(ok(user))

      const result = await AccountLifecycleService.deleteAccount('user-1')

      const value = expectOk(result)
      expect(value.scheduledAt).toBe(existingDate.toISOString())
      expect(mockedUser.scheduleDeletion).not.toHaveBeenCalled()
      expect(mockedScheduleDeletion).not.toHaveBeenCalled()
      expect(mockedSendEmail).not.toHaveBeenCalled()
    })

    it('returns CONFLICT when user is sole OWNER of a workspace with members', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(ok(2))

      const result = await AccountLifecycleService.deleteAccount('user-1')

      expectErr(result, 'CONFLICT')
      expect(mockedUser.scheduleDeletion).not.toHaveBeenCalled()
      expect(mockedScheduleDeletion).not.toHaveBeenCalled()
    })

    it('propagates not found from initial lookup', async () => {
      mockedUser.findById.mockResolvedValue(err(notFound('User')))

      const result = await AccountLifecycleService.deleteAccount('user-1')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })

    it('reverts the DB schedule when queue enqueue fails', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(ok(0))
      mockedUser.scheduleDeletion.mockImplementation(async (_id, at) =>
        ok({ ...user, deletionScheduledAt: at }),
      )
      mockedUser.clearDeletionSchedule.mockResolvedValue(
        ok({ ...user, deletionScheduledAt: null }),
      )
      mockedScheduleDeletion.mockRejectedValueOnce(new Error('queue boom'))

      const result = await AccountLifecycleService.deleteAccount('user-1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUser.clearDeletionSchedule).toHaveBeenCalledWith('user-1')
      expect(mockedUser.deleteAllSessions).not.toHaveBeenCalled()
      expect(mockedSendEmail).not.toHaveBeenCalled()
    })

    it('does not fail the request when email send throws', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(ok(0))
      mockedUser.scheduleDeletion.mockImplementation(async (_id, at) =>
        ok({ ...user, deletionScheduledAt: at }),
      )
      mockedSendEmail.mockRejectedValue(new Error('resend boom'))

      const result = await AccountLifecycleService.deleteAccount('user-1')

      expectOk(result)
      expect(mockedScheduleDeletion).toHaveBeenCalled()
    })

    it('propagates error when counting blocking workspaces fails', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(
        err(databaseError()),
      )

      const result = await AccountLifecycleService.deleteAccount('user-1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUser.scheduleDeletion).not.toHaveBeenCalled()
    })

    it('propagates error when scheduling deletion in the DB fails', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(ok(0))
      mockedUser.scheduleDeletion.mockResolvedValue(err(databaseError()))

      const result = await AccountLifecycleService.deleteAccount('user-1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedScheduleDeletion).not.toHaveBeenCalled()
    })
  })

  describe('requestExport()', () => {
    beforeEach(() => {
      mockedConsume.mockResolvedValue(ok(undefined))
      mockedEnqueueExport.mockResolvedValue('job-1')
    })

    it('enqueues a data-export job and returns requestedAt', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))

      const result = await AccountLifecycleService.requestExport('user-1')

      const value = expectOk(result)
      expect(typeof value.requestedAt).toBe('string')
      expect(mockedConsume).toHaveBeenCalledWith(expect.anything(), 'user-1')
      expect(mockedEnqueueExport).toHaveBeenCalledWith('user-1')
    })

    it('allows export while account is in deletion grace period', async () => {
      const user = createFakeUser({
        id: 'user-1',
        deletionScheduledAt: new Date('2026-06-01T00:00:00Z'),
      })
      mockedUser.findById.mockResolvedValue(ok(user))

      const result = await AccountLifecycleService.requestExport('user-1')

      expectOk(result)
      expect(mockedEnqueueExport).toHaveBeenCalledWith('user-1')
    })

    it('returns RATE_LIMITED without enqueuing when limiter denies', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedConsume.mockResolvedValue(err(rateLimited(3600)))

      const result = await AccountLifecycleService.requestExport('user-1')

      expectErr(result, 'RATE_LIMITED')
      expect(mockedEnqueueExport).not.toHaveBeenCalled()
    })

    it('returns DATABASE_ERROR when enqueue throws', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedEnqueueExport.mockRejectedValueOnce(new Error('redis down'))

      const result = await AccountLifecycleService.requestExport('user-1')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('propagates RESOURCE_NOT_FOUND from initial lookup', async () => {
      mockedUser.findById.mockResolvedValue(err(notFound('User')))

      const result = await AccountLifecycleService.requestExport('user-1')

      expectErr(result, 'RESOURCE_NOT_FOUND')
      expect(mockedConsume).not.toHaveBeenCalled()
      expect(mockedEnqueueExport).not.toHaveBeenCalled()
    })
  })

  describe('cancelDeletion()', () => {
    it('returns canceled:false when no deletion was scheduled', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))

      const result = await AccountLifecycleService.cancelDeletion('user-1')

      expect(expectOk(result)).toEqual({ canceled: false })
      expect(mockedCancelDeletion).not.toHaveBeenCalled()
      expect(mockedUser.clearDeletionSchedule).not.toHaveBeenCalled()
    })

    it('cancels the job, clears the flag and invalidates cache when pending', async () => {
      const user = createFakeUser({
        id: 'user-1',
        deletionScheduledAt: new Date('2026-06-01T00:00:00Z'),
      })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.clearDeletionSchedule.mockResolvedValue(
        ok({ ...user, deletionScheduledAt: null }),
      )
      mockedCancelDeletion.mockResolvedValue(true)
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await AccountLifecycleService.cancelDeletion('user-1')

      expect(expectOk(result)).toEqual({ canceled: true })
      expect(mockedCancelDeletion).toHaveBeenCalledWith('user-1')
      expect(mockedUser.clearDeletionSchedule).toHaveBeenCalledWith('user-1')
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('propagates RESOURCE_NOT_FOUND from initial lookup', async () => {
      mockedUser.findById.mockResolvedValue(err(notFound('User')))

      const result = await AccountLifecycleService.cancelDeletion('user-1')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })

    it('propagates error when clearing the deletion schedule fails', async () => {
      const user = createFakeUser({
        id: 'user-1',
        deletionScheduledAt: new Date('2026-06-01T00:00:00Z'),
      })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedCancelDeletion.mockResolvedValue(true)
      mockedUser.clearDeletionSchedule.mockResolvedValue(err(databaseError()))

      const result = await AccountLifecycleService.cancelDeletion('user-1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })
  })
})
