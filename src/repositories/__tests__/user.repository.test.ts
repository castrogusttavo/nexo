import { describe, expect, it } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
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

  describe('scheduleDeletion()', () => {
    it('should set deletionScheduledAt', async () => {
      const seeded = await seedUser()
      const when = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const result = await UserRepository.scheduleDeletion(seeded.id, when)

      const user = expectOk(result)
      expect(user.deletionScheduledAt?.toISOString()).toBe(when.toISOString())
    })

    it('should return RESOURCE_NOT_FOUND for unknown user', async () => {
      const result = await UserRepository.scheduleDeletion(
        'nonexistent',
        new Date(),
      )
      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('clearDeletionSchedule()', () => {
    it('should null out deletionScheduledAt', async () => {
      const seeded = await seedUser()
      await UserRepository.scheduleDeletion(seeded.id, new Date())

      const result = await UserRepository.clearDeletionSchedule(seeded.id)

      const user = expectOk(result)
      expect(user.deletionScheduledAt).toBeNull()
    })
  })

  describe('deleteHard()', () => {
    it('should remove the user and cascade short-links', async () => {
      const seeded = await seedUser()
      await prisma.shortLink.create({
        data: { title: 't', url: 'https://x.test', userId: seeded.id },
      })

      const result = await UserRepository.deleteHard(seeded.id)

      expectOk(result)
      expect(
        await prisma.user.findUnique({ where: { id: seeded.id } }),
      ).toBeNull()
      expect(
        await prisma.shortLink.count({ where: { userId: seeded.id } }),
      ).toBe(0)
    })

    it('should return RESOURCE_NOT_FOUND for unknown user', async () => {
      const result = await UserRepository.deleteHard('nonexistent')
      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('countBlockingSoleOwnerWorkspaces()', () => {
    it('returns 0 when user has no workspaces', async () => {
      const seeded = await seedUser()

      const result = await UserRepository.countBlockingSoleOwnerWorkspaces(
        seeded.id,
      )

      expect(expectOk(result)).toBe(0)
    })

    it('returns 0 when user is sole OWNER but has no other members', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      await seedMembership({
        userId: user.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })

      const result = await UserRepository.countBlockingSoleOwnerWorkspaces(
        user.id,
      )

      expect(expectOk(result)).toBe(0)
    })

    it('returns 0 when another OWNER exists in the same workspace', async () => {
      const user = await seedUser()
      const other = await seedUser()
      const ws = await seedWorkspace()
      await seedMembership({
        userId: user.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })
      await seedMembership({
        userId: other.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })

      const result = await UserRepository.countBlockingSoleOwnerWorkspaces(
        user.id,
      )

      expect(expectOk(result)).toBe(0)
    })

    it('returns count when user is sole OWNER and other non-OWNER members exist', async () => {
      const user = await seedUser()
      const member = await seedUser()
      const ws = await seedWorkspace()
      await seedMembership({
        userId: user.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })
      await seedMembership({
        userId: member.id,
        workspaceId: ws.id,
        role: 'MEMBER',
      })

      const result = await UserRepository.countBlockingSoleOwnerWorkspaces(
        user.id,
      )

      expect(expectOk(result)).toBe(1)
    })

    it('ignores workspaces where user is not OWNER', async () => {
      const user = await seedUser()
      const owner = await seedUser()
      const ws = await seedWorkspace()
      await seedMembership({
        userId: owner.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })
      await seedMembership({
        userId: user.id,
        workspaceId: ws.id,
        role: 'MEMBER',
      })

      const result = await UserRepository.countBlockingSoleOwnerWorkspaces(
        user.id,
      )

      expect(expectOk(result)).toBe(0)
    })
  })
})
