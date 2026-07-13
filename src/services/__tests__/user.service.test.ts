import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createFakeUser,
  createFakeUserDTO,
} from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import type { UserWithMemberships } from '@/src/repositories/user.repository'
import { UserService } from '@/src/services/user.service'

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

import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { UserCache } from '@/src/cache/user.cache'
import { rateLimited } from '@/src/errors/app-error'
import { sendDeleteAccountEmail } from '@/src/lib/mail/user/send-delete-account'
import {
  cancelAccountDeletion,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'
import { enqueueUserExport } from '@/src/lib/queue/data-export'
import { consume } from '@/src/lib/rate-limit'
import { UserRepository } from '@/src/repositories/user.repository'

const mockedUser = vi.mocked(UserRepository)
const mockedUserCache = vi.mocked(UserCache)
const mockedScheduleDeletion = vi.mocked(scheduleAccountDeletion)
const mockedCancelDeletion = vi.mocked(cancelAccountDeletion)
const mockedSendEmail = vi.mocked(sendDeleteAccountEmail)
const mockedEnqueueExport = vi.mocked(enqueueUserExport)
const mockedConsume = vi.mocked(consume)

function withMemberships(
  user: ReturnType<typeof createFakeUser>,
): UserWithMemberships {
  return { ...user, memberships: [] }
}

describe('UserService', () => {
  describe('getProfile()', () => {
    it('should return cached user when cache hit', async () => {
      const cachedDTO = createFakeUserDTO({ id: 'user-1' })
      mockedUserCache.get.mockResolvedValue(cachedDTO)

      const result = await UserService.getProfile('user-1')

      const value = expectOk(result)
      expect(value).toEqual(cachedDTO)
      expect(mockedUser.findByIdWithMemberships).not.toHaveBeenCalled()
    })

    it('should fetch from repository and populate cache on cache miss', async () => {
      const user = withMemberships(createFakeUser({ id: 'user-1' }))
      mockedUserCache.get.mockResolvedValue(null)
      mockedUser.findByIdWithMemberships.mockResolvedValue(ok(user))
      mockedUserCache.set.mockResolvedValue(undefined)

      const result = await UserService.getProfile('user-1')

      const value = expectOk(result)
      expect(value.id).toBe('user-1')
      expect(mockedUser.findByIdWithMemberships).toHaveBeenCalledWith('user-1')
      expect(mockedUserCache.set).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ id: 'user-1' }),
      )
    })

    it('should propagate repository error', async () => {
      mockedUserCache.get.mockResolvedValue(null)
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        err(notFound('User')),
      )

      const result = await UserService.getProfile('user-1')

      const error = expectErr(result, 'RESOURCE_NOT_FOUND')
      expect(error.message).toBe('User not found')
    })
  })

  describe('updateProfile()', () => {
    it('should update name successfully and refresh cache', async () => {
      const updatedUser = createFakeUser({ id: 'user-1', name: 'New Name' })
      mockedUser.update.mockResolvedValue(ok(updatedUser))
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        ok(withMemberships(updatedUser)),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.set.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        name: 'New Name',
      })

      const value = expectOk(result)
      expect(value.name).toBe('New Name')
      expect(mockedUser.update).toHaveBeenCalledWith('user-1', {
        name: 'New Name',
      })
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
      expect(mockedUserCache.set).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ id: 'user-1', name: 'New Name' }),
      )
    })

    it('should return conflict when email belongs to another user', async () => {
      const existingUser = createFakeUser({
        id: 'other-user',
        email: 'taken@example.com',
      })
      mockedUser.findByEmail.mockResolvedValue(ok(existingUser))

      const result = await UserService.updateProfile('user-1', {
        email: 'taken@example.com',
      })

      expectErr(result, 'CONFLICT')
      expect(mockedUser.update).not.toHaveBeenCalled()
    })

    it('should allow updating to own current email', async () => {
      const currentUser = createFakeUser({
        id: 'user-1',
        email: 'my@example.com',
      })
      mockedUser.findByEmail.mockResolvedValue(ok(currentUser))
      mockedUser.update.mockResolvedValue(ok(currentUser))
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        ok(withMemberships(currentUser)),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.set.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        email: 'my@example.com',
      })

      expectOk(result)
      expect(mockedUser.update).toHaveBeenCalled()
    })

    it('should allow email update when email is not taken', async () => {
      const updatedUser = createFakeUser({
        id: 'user-1',
        email: 'new@example.com',
      })
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedUser.update.mockResolvedValue(ok(updatedUser))
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        ok(withMemberships(updatedUser)),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.set.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        email: 'new@example.com',
      })

      const value = expectOk(result)
      expect(value.email).toBe('new@example.com')
    })

    it('should propagate findByEmail repository error', async () => {
      mockedUser.findByEmail.mockResolvedValue(err(databaseError()))

      const result = await UserService.updateProfile('user-1', {
        email: 'any@example.com',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUser.update).not.toHaveBeenCalled()
    })

    it('should return USERNAME_CONFLICT when username belongs to another user', async () => {
      const existingUser = createFakeUser({
        id: 'other-user',
        username: 'taken',
      })
      mockedUser.findByUsername.mockResolvedValue(ok(existingUser))

      const result = await UserService.updateProfile('user-1', {
        username: 'taken',
      })

      expectErr(result, 'USERNAME_CONFLICT')
      expect(mockedUser.update).not.toHaveBeenCalled()
    })

    it('should allow keeping own current username', async () => {
      const currentUser = createFakeUser({ id: 'user-1', username: 'mine' })
      mockedUser.findByUsername.mockResolvedValue(ok(currentUser))
      mockedUser.update.mockResolvedValue(ok(currentUser))
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        ok(withMemberships(currentUser)),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.set.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        username: 'mine',
      })

      expectOk(result)
      expect(mockedUser.update).toHaveBeenCalled()
    })

    it('should allow username update when it is not taken', async () => {
      const updatedUser = createFakeUser({ id: 'user-1', username: 'fresh' })
      mockedUser.findByUsername.mockResolvedValue(ok(null))
      mockedUser.update.mockResolvedValue(ok(updatedUser))
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        ok(withMemberships(updatedUser)),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.set.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        username: 'fresh',
      })

      const value = expectOk(result)
      expect(value.username).toBe('fresh')
    })

    it('should propagate findByUsername repository error', async () => {
      mockedUser.findByUsername.mockResolvedValue(err(databaseError()))

      const result = await UserService.updateProfile('user-1', {
        username: 'whatever',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUser.update).not.toHaveBeenCalled()
    })

    it('should propagate update repository error', async () => {
      mockedUser.update.mockResolvedValue(err(databaseError()))
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        name: 'New Name',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate post-update findByIdWithMemberships error', async () => {
      const updatedUser = createFakeUser({ id: 'user-1' })
      mockedUser.update.mockResolvedValue(ok(updatedUser))
      mockedUserCache.invalidate.mockResolvedValue(undefined)
      mockedUser.findByIdWithMemberships.mockResolvedValue(
        err(databaseError('post-update read failed')),
      )

      const result = await UserService.updateProfile('user-1', {
        name: 'New Name',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
      expect(mockedUserCache.set).not.toHaveBeenCalled()
    })
  })

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

      const result = await UserService.deleteAccount('user-1')

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

      const result = await UserService.deleteAccount('user-1')

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

      const result = await UserService.deleteAccount('user-1')

      expectErr(result, 'CONFLICT')
      expect(mockedUser.scheduleDeletion).not.toHaveBeenCalled()
      expect(mockedScheduleDeletion).not.toHaveBeenCalled()
    })

    it('propagates not found from initial lookup', async () => {
      mockedUser.findById.mockResolvedValue(err(notFound('User')))

      const result = await UserService.deleteAccount('user-1')

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

      const result = await UserService.deleteAccount('user-1')

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

      const result = await UserService.deleteAccount('user-1')

      expectOk(result)
      expect(mockedScheduleDeletion).toHaveBeenCalled()
    })

    it('propagates error when counting blocking workspaces fails', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(
        err(databaseError()),
      )

      const result = await UserService.deleteAccount('user-1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUser.scheduleDeletion).not.toHaveBeenCalled()
    })

    it('propagates error when scheduling deletion in the DB fails', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedUser.countBlockingSoleOwnerWorkspaces.mockResolvedValue(ok(0))
      mockedUser.scheduleDeletion.mockResolvedValue(err(databaseError()))

      const result = await UserService.deleteAccount('user-1')

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

      const result = await UserService.requestExport('user-1')

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

      const result = await UserService.requestExport('user-1')

      expectOk(result)
      expect(mockedEnqueueExport).toHaveBeenCalledWith('user-1')
    })

    it('returns RATE_LIMITED without enqueuing when limiter denies', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedConsume.mockResolvedValue(err(rateLimited(3600)))

      const result = await UserService.requestExport('user-1')

      expectErr(result, 'RATE_LIMITED')
      expect(mockedEnqueueExport).not.toHaveBeenCalled()
    })

    it('returns DATABASE_ERROR when enqueue throws', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))
      mockedEnqueueExport.mockRejectedValueOnce(new Error('redis down'))

      const result = await UserService.requestExport('user-1')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('propagates RESOURCE_NOT_FOUND from initial lookup', async () => {
      mockedUser.findById.mockResolvedValue(err(notFound('User')))

      const result = await UserService.requestExport('user-1')

      expectErr(result, 'RESOURCE_NOT_FOUND')
      expect(mockedConsume).not.toHaveBeenCalled()
      expect(mockedEnqueueExport).not.toHaveBeenCalled()
    })
  })

  describe('cancelDeletion()', () => {
    it('returns canceled:false when no deletion was scheduled', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedUser.findById.mockResolvedValue(ok(user))

      const result = await UserService.cancelDeletion('user-1')

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

      const result = await UserService.cancelDeletion('user-1')

      expect(expectOk(result)).toEqual({ canceled: true })
      expect(mockedCancelDeletion).toHaveBeenCalledWith('user-1')
      expect(mockedUser.clearDeletionSchedule).toHaveBeenCalledWith('user-1')
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('propagates RESOURCE_NOT_FOUND from initial lookup', async () => {
      mockedUser.findById.mockResolvedValue(err(notFound('User')))

      const result = await UserService.cancelDeletion('user-1')

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

      const result = await UserService.cancelDeletion('user-1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })
  })

  describe('saveOnboardingRole()', () => {
    it('saves the role, invalidates cache and returns ok', async () => {
      mockedUser.saveRole.mockResolvedValue(
        ok(createFakeUser({ id: 'user-1' })),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.saveOnboardingRole('user-1', {
        role: 'DEVELOPER',
      })

      expectOk(result)
      expect(mockedUser.saveRole).toHaveBeenCalledWith(
        'user-1',
        'DEVELOPER',
        'BRINGS',
      )
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('propagates repository error and skips cache invalidation', async () => {
      mockedUser.saveRole.mockResolvedValue(err(databaseError()))

      const result = await UserService.saveOnboardingRole('user-1', {
        role: 'DEVELOPER',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })
  })

  describe('saveOnboardingProfile()', () => {
    it('should save the name and advance the step to ROLE', async () => {
      mockedUser.saveProfile.mockResolvedValue(ok(createFakeUser()))

      const result = await UserService.saveOnboardingProfile('user1', {
        name: 'Gusttavo',
      })

      expectOk(result)
      expect(mockedUser.saveProfile).toHaveBeenCalledWith(
        'user1',
        'Gusttavo',
        'ROLE',
      )
    })
  })

  describe('saveOnboardingGoals()', () => {
    it('saves the goals, invalidates cache and returns ok', async () => {
      mockedUser.saveGoals.mockResolvedValue(
        ok(createFakeUser({ id: 'user-1' })),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.saveOnboardingGoals('user-1', {
        goals: ['ROADMAP', 'SPRINTS'],
      })

      expectOk(result)
      expect(mockedUser.saveGoals).toHaveBeenCalledWith(
        'user-1',
        ['ROADMAP', 'SPRINTS'],
        'WORKSPACE',
      )
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('propagates repository error and skips cache invalidation', async () => {
      mockedUser.saveGoals.mockResolvedValue(err(databaseError()))

      const result = await UserService.saveOnboardingGoals('user-1', {
        goals: ['ROADMAP'],
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })
  })

  describe('completeOnboardingStep()', () => {
    it('advances to the next step, invalidates cache and returns ok', async () => {
      mockedUser.updateOnboardingStep.mockResolvedValue(
        ok(createFakeUser({ id: 'user-1' })),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.completeOnboardingStep('user-1', 'ROLE')

      expectOk(result)
      expect(mockedUser.updateOnboardingStep).toHaveBeenCalledWith(
        'user-1',
        'BRINGS',
      )
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('propagates repository error and skips cache invalidation', async () => {
      mockedUser.updateOnboardingStep.mockResolvedValue(err(databaseError()))

      const result = await UserService.completeOnboardingStep('user-1', 'ROLE')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })
  })

  describe('goBackOnboardingStep()', () => {
    it('should move the step back and invalidate the cache', async () => {
      mockedUser.findById.mockResolvedValue(
        ok(createFakeUser({ onboardingStep: 'BRINGS' })),
      )
      mockedUser.updateOnboardingStep.mockResolvedValue(ok(createFakeUser()))

      const result = await UserService.goBackOnboardingStep('user1')

      expectOk(result)
      expect(mockedUser.updateOnboardingStep).toHaveBeenCalledWith(
        'user1',
        'ROLE',
      )
    })

    it('should be a no-op the first step', async () => {
      mockedUser.findById.mockResolvedValue(
        ok(createFakeUser({ onboardingStep: 'PROFILE' })),
      )

      const result = await UserService.goBackOnboardingStep('user1')

      expectOk(result)
      expect(mockedUser.updateOnboardingStep).not.toHaveBeenCalled()
    })
  })

  describe('getOnboardingProfile()', () => {
    it('should report hasPassword from the credential account', async () => {
      mockedUser.findById.mockResolvedValue(
        ok(createFakeUser({ name: 'Gusttavo', onboardingStep: 'PROFILE' })),
      )
      mockedUser.hasCredentialAccount.mockResolvedValue(ok(true))

      const result = await UserService.getOnboardingProfile('user1')

      const profile = expectOk(result)
      expect(profile.name).toBe('Gusttavo')
      expect(profile.hasPassword).toBe(true)
    })
  })

  describe('acceptConsents()', () => {
    it('should persist both consents with the current document versions', async () => {
      mockedUser.acceptConsents.mockResolvedValue(ok(undefined))

      const result = await UserService.acceptConsents('user1', {
        ipAddress: '1.2.3.4',
        userAgent: 'vitest',
      })

      expectOk(result)
      expect(mockedUser.acceptConsents).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          ipAddress: '1.2.3.4',
          userAgent: 'vitest',
        }),
      )
    })

    it('should propagate a persistence failure', async () => {
      mockedUser.acceptConsents.mockResolvedValue(err(databaseError('boom')))

      const result = await UserService.acceptConsents('user1', {
        ipAddress: null,
        userAgent: null,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
