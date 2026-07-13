import { describe, expect, it, vi } from 'vitest'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { OnboardingService } from '@/src/services/onboarding.service'

vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/cache/user.cache')

import { UserCache } from '@/src/cache/user.cache'
import { UserRepository } from '@/src/repositories/user.repository'

const mockedUser = vi.mocked(UserRepository)
const mockedUserCache = vi.mocked(UserCache)

describe('OnboardingService', () => {
  describe('saveOnboardingRole()', () => {
    it('saves the role, invalidates cache and returns ok', async () => {
      mockedUser.saveRole.mockResolvedValue(
        ok(createFakeUser({ id: 'user-1' })),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await OnboardingService.saveOnboardingRole('user-1', {
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

      const result = await OnboardingService.saveOnboardingRole('user-1', {
        role: 'DEVELOPER',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })
  })

  describe('saveOnboardingProfile()', () => {
    it('should save the name and advance the step to ROLE', async () => {
      mockedUser.saveProfile.mockResolvedValue(ok(createFakeUser()))

      const result = await OnboardingService.saveOnboardingProfile('user1', {
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

      const result = await OnboardingService.saveOnboardingGoals('user-1', {
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

      const result = await OnboardingService.saveOnboardingGoals('user-1', {
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

      const result = await OnboardingService.completeOnboardingStep(
        'user-1',
        'ROLE',
      )

      expectOk(result)
      expect(mockedUser.updateOnboardingStep).toHaveBeenCalledWith(
        'user-1',
        'BRINGS',
      )
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('propagates repository error and skips cache invalidation', async () => {
      mockedUser.updateOnboardingStep.mockResolvedValue(err(databaseError()))

      const result = await OnboardingService.completeOnboardingStep(
        'user-1',
        'ROLE',
      )

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

      const result = await OnboardingService.goBackOnboardingStep('user1')

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

      const result = await OnboardingService.goBackOnboardingStep('user1')

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

      const result = await OnboardingService.getOnboardingProfile('user1')

      const profile = expectOk(result)
      expect(profile.name).toBe('Gusttavo')
      expect(profile.hasPassword).toBe(true)
    })
  })
})
