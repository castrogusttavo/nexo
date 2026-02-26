import { describe, expect, it } from 'vitest'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { UserRepository } from '@/src/repositories/user.repository'

describe('UserRepository', () => {
  describe('findById()', () => {
    it('should return user when found', async () => {
      const seeded = await seedUser({ name: 'Found User' })

      const result = await UserRepository.findById(seeded.id)

      const user = expectOk(result)
      expect(user.id).toBe(seeded.id)
      expect(user.name).toBe('Found User')
    })

    it('should return RESOURCE_NOT_FOUND when user does not exist', async () => {
      const result = await UserRepository.findById('nonexistent-id')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('findByEmail()', () => {
    it('should return user when email exists', async () => {
      const seeded = await seedUser({ email: 'exists@example.com' })

      const result = await UserRepository.findByEmail('exists@example.com')

      const user = expectOk(result)
      expect(user).not.toBeNull()
      expect(user?.id).toBe(seeded.id)
    })

    it('should return null when email does not exist', async () => {
      const result = await UserRepository.findByEmail('ghost@example.com')

      const user = expectOk(result)
      expect(user).toBeNull()
    })
  })

  describe('create()', () => {
    it('should create a user successfully', async () => {
      const result = await UserRepository.create({
        name: 'New User',
        email: 'new@example.com',
      })

      const user = expectOk(result)
      expect(user.name).toBe('New User')
      expect(user.email).toBe('new@example.com')
      expect(user.role).toBe('MEMBER')
      expect(user.id).toBeDefined()
    })

    it('should return CONFLICT on duplicate email', async () => {
      await seedUser({ email: 'dup@example.com' })

      const result = await UserRepository.create({
        name: 'Duplicate',
        email: 'dup@example.com',
      })

      expectErr(result, 'CONFLICT')
    })
  })

  describe('update()', () => {
    it('should update user name', async () => {
      const seeded = await seedUser({ name: 'Old Name' })

      const result = await UserRepository.update(seeded.id, {
        name: 'New Name',
      })

      const user = expectOk(result)
      expect(user.name).toBe('New Name')
    })

    it('should update user email', async () => {
      const seeded = await seedUser({ email: 'old@example.com' })

      const result = await UserRepository.update(seeded.id, {
        email: 'new@example.com',
      })

      const user = expectOk(result)
      expect(user.email).toBe('new@example.com')
    })
  })
})
