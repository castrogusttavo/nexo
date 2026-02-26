import { describe, expect, it, vi } from 'vitest'
import {
  createFakeUser,
  createFakeUserDTO,
} from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, notFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { UserService } from '@/src/services/user.service'

vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/cache/user.cache')

import { UserCache } from '@/src/cache/user.cache'
import { UserRepository } from '@/src/repositories/user.repository'

const mockedRepo = vi.mocked(UserRepository)
const mockedCache = vi.mocked(UserCache)

describe('UserService', () => {
  describe('getProfile()', () => {
    it('should return cached user when cache hit', async () => {
      const cachedDTO = createFakeUserDTO({ id: 'user-1' })
      mockedCache.get.mockResolvedValue(cachedDTO)

      const result = await UserService.getProfile('user-1')

      const value = expectOk(result)
      expect(value).toEqual(cachedDTO)
      expect(mockedRepo.findById).not.toHaveBeenCalled()
    })

    it('should fetch from repository and populate cache on cache miss', async () => {
      const user = createFakeUser({ id: 'user-1' })
      mockedCache.get.mockResolvedValue(null)
      mockedRepo.findById.mockResolvedValue(ok(user))
      mockedCache.set.mockResolvedValue(undefined)

      const result = await UserService.getProfile('user-1')

      const value = expectOk(result)
      expect(value.id).toBe('user-1')
      expect(mockedRepo.findById).toHaveBeenCalledWith('user-1')
      expect(mockedCache.set).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ id: 'user-1' }),
      )
    })

    it('should propagate repository error', async () => {
      mockedCache.get.mockResolvedValue(null)
      mockedRepo.findById.mockResolvedValue(err(notFound('User')))

      const result = await UserService.getProfile('user-1')

      const error = expectErr(result, 'RESOURCE_NOT_FOUND')
      expect(error.message).toBe('User not found')
    })
  })

  describe('updateProfile()', () => {
    it('should update name successfully and invalidate cache', async () => {
      const updatedUser = createFakeUser({ id: 'user-1', name: 'New Name' })
      mockedRepo.update.mockResolvedValue(ok(updatedUser))
      mockedCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        name: 'New Name',
      })

      const value = expectOk(result)
      expect(value.name).toBe('New Name')
      expect(mockedRepo.update).toHaveBeenCalledWith('user-1', {
        name: 'New Name',
      })
      expect(mockedCache.invalidate).toHaveBeenCalledWith('user-1')
    })

    it('should return conflict when email belongs to another user', async () => {
      const existingUser = createFakeUser({
        id: 'other-user',
        email: 'taken@example.com',
      })
      mockedRepo.findByEmail.mockResolvedValue(ok(existingUser))

      const result = await UserService.updateProfile('user-1', {
        email: 'taken@example.com',
      })

      expectErr(result, 'CONFLICT')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should allow updating to own current email', async () => {
      const currentUser = createFakeUser({
        id: 'user-1',
        email: 'my@example.com',
      })
      mockedRepo.findByEmail.mockResolvedValue(ok(currentUser))
      mockedRepo.update.mockResolvedValue(ok(currentUser))
      mockedCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        email: 'my@example.com',
      })

      expectOk(result)
      expect(mockedRepo.update).toHaveBeenCalled()
    })

    it('should allow email update when email is not taken', async () => {
      const updatedUser = createFakeUser({
        id: 'user-1',
        email: 'new@example.com',
      })
      mockedRepo.findByEmail.mockResolvedValue(ok(null))
      mockedRepo.update.mockResolvedValue(ok(updatedUser))
      mockedCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        email: 'new@example.com',
      })

      const value = expectOk(result)
      expect(value.email).toBe('new@example.com')
    })

    it('should propagate findByEmail repository error', async () => {
      mockedRepo.findByEmail.mockResolvedValue(err(databaseError()))

      const result = await UserService.updateProfile('user-1', {
        email: 'any@example.com',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate update repository error', async () => {
      mockedRepo.update.mockResolvedValue(err(databaseError()))
      mockedCache.invalidate.mockResolvedValue(undefined)

      const result = await UserService.updateProfile('user-1', {
        name: 'New Name',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
