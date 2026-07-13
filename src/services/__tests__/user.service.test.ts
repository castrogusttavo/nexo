import { describe, expect, it, vi } from 'vitest'
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

import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { UserCache } from '@/src/cache/user.cache'
import { UserRepository } from '@/src/repositories/user.repository'

const mockedUser = vi.mocked(UserRepository)
const mockedUserCache = vi.mocked(UserCache)

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
