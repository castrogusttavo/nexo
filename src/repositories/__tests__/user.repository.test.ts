import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { UserRepository } from '@/src/repositories/user.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

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

  describe('findByIdWithMemberships()', () => {
    it('should return memberships ordered by createdAt asc with workspace', async () => {
      const user = await seedUser()
      const wsA = await seedWorkspace({ name: 'WS A' })
      const wsB = await seedWorkspace({ name: 'WS B' })

      // Insert the newer membership first to prove ordering is by createdAt,
      // not by insertion order.
      await prisma.membership.create({
        data: {
          userId: user.id,
          workspaceId: wsB.id,
          role: 'MEMBER',
          createdAt: new Date('2025-02-01T00:00:00.000Z'),
        },
      })
      await prisma.membership.create({
        data: {
          userId: user.id,
          workspaceId: wsA.id,
          role: 'OWNER',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      })

      const result = await UserRepository.findByIdWithMemberships(user.id)

      const found = expectOk(result)
      expect(found.id).toBe(user.id)
      expect(found.memberships).toHaveLength(2)
      expect(found.memberships[0]?.workspaceId).toBe(wsA.id)
      expect(found.memberships[0]?.workspace.name).toBe('WS A')
      expect(found.memberships[1]?.workspaceId).toBe(wsB.id)
    })

    it('should return an empty memberships array when user has none', async () => {
      const user = await seedUser()

      const result = await UserRepository.findByIdWithMemberships(user.id)

      const found = expectOk(result)
      expect(found.memberships).toEqual([])
    })

    it('should return RESOURCE_NOT_FOUND when user does not exist', async () => {
      const result =
        await UserRepository.findByIdWithMemberships('nonexistent-id')

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

  describe('findByUsername()', () => {
    it('should return user when username exists', async () => {
      const seeded = await seedUser()

      const result = await UserRepository.findByUsername(seeded.username)

      const user = expectOk(result)
      expect(user?.id).toBe(seeded.id)
    })

    it('should return null when username does not exist', async () => {
      const result = await UserRepository.findByUsername('ghost-username')

      const user = expectOk(result)
      expect(user).toBeNull()
    })
  })

  describe('create()', () => {
    it('should create a user successfully', async () => {
      const result = await UserRepository.create({
        name: 'New User',
        email: 'new@example.com',
        username: 'new-user',
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
        username: 'duplicate-user',
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

    it('should return CONFLICT when the username is already taken', async () => {
      const taken = await seedUser()
      const seeded = await seedUser()

      const result = await UserRepository.update(seeded.id, {
        username: taken.username,
      })

      expectErr(result, 'CONFLICT')
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

    it('should return RESOURCE_NOT_FOUND for unknown user', async () => {
      const result = await UserRepository.clearDeletionSchedule('nonexistent')
      expectErr(result, 'RESOURCE_NOT_FOUND')
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

    it('returns DATABASE_ERROR when the count query throws', async () => {
      vi.spyOn(prisma.workspace, 'count').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await UserRepository.countBlockingSoleOwnerWorkspaces('u')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('updateOnboardingStep()', () => {
    it('should advance the onboarding step', async () => {
      const seeded = await seedUser()

      const result = await UserRepository.updateOnboardingStep(
        seeded.id,
        'WORKSPACE',
      )

      const user = expectOk(result)
      expect(user.onboardingStep).toBe('WORKSPACE')
    })

    it('should return RESOURCE_NOT_FOUND for unknown user', async () => {
      const result = await UserRepository.updateOnboardingStep('nope', 'ROLE')
      expectErr(result, 'RESOURCE_NOT_FOUND')
    })

    it('should return DATABASE_ERROR on non-P2025 failures', async () => {
      vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('boom'))

      const result = await UserRepository.updateOnboardingStep('u', 'ROLE')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('saveRole()', () => {
    it('should persist the role and next step', async () => {
      const seeded = await seedUser()

      const result = await UserRepository.saveRole(
        seeded.id,
        'DEVELOPER',
        'BRINGS',
      )

      const user = expectOk(result)
      expect(user.role).toBe('DEVELOPER')
      expect(user.onboardingStep).toBe('BRINGS')
    })

    it('should return RESOURCE_NOT_FOUND for unknown user', async () => {
      const result = await UserRepository.saveRole(
        'nope',
        'DEVELOPER',
        'BRINGS',
      )
      expectErr(result, 'RESOURCE_NOT_FOUND')
    })

    it('should return DATABASE_ERROR on non-P2025 failures', async () => {
      vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('boom'))

      const result = await UserRepository.saveRole('u', 'DEVELOPER', 'BRINGS')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('saveGoals()', () => {
    it('should persist the goals and next step', async () => {
      const seeded = await seedUser()

      const result = await UserRepository.saveGoals(
        seeded.id,
        ['ROADMAP', 'SPRINTS'],
        'WORKSPACE',
      )

      const user = expectOk(result)
      expect(user.goals).toEqual(['ROADMAP', 'SPRINTS'])
      expect(user.onboardingStep).toBe('WORKSPACE')
    })

    it('should return RESOURCE_NOT_FOUND for unknown user', async () => {
      const result = await UserRepository.saveGoals(
        'nope',
        ['ROADMAP'],
        'WORKSPACE',
      )
      expectErr(result, 'RESOURCE_NOT_FOUND')
    })

    it('should return DATABASE_ERROR on non-P2025 failures', async () => {
      vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('boom'))

      const result = await UserRepository.saveGoals(
        'u',
        ['ROADMAP'],
        'WORKSPACE',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('read and write query failures', () => {
    it('findById() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await UserRepository.findById('x'), 'DATABASE_ERROR')
    })

    it('findByIdWithMemberships() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await UserRepository.findByIdWithMemberships('x'),
        'DATABASE_ERROR',
      )
    })

    it('findByEmail() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await UserRepository.findByEmail('a@b.test'), 'DATABASE_ERROR')
    })

    it('findByUsername() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await UserRepository.findByUsername('user'), 'DATABASE_ERROR')
    })

    it('create() returns DATABASE_ERROR on non-unique-constraint failures', async () => {
      vi.spyOn(prisma.user, 'create').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await UserRepository.create({
          name: 'X',
          email: 'x@y.test',
          username: 'x',
        }),
        'DATABASE_ERROR',
      )
    })

    it('update() returns DATABASE_ERROR on non-unique-constraint failures', async () => {
      vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await UserRepository.update('u', { name: 'X' }),
        'DATABASE_ERROR',
      )
    })

    it('scheduleDeletion() returns DATABASE_ERROR on non-P2025 failures', async () => {
      vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await UserRepository.scheduleDeletion('u', new Date()),
        'DATABASE_ERROR',
      )
    })

    it('clearDeletionSchedule() returns DATABASE_ERROR on non-P2025 failures', async () => {
      vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await UserRepository.clearDeletionSchedule('u'),
        'DATABASE_ERROR',
      )
    })

    it('deleteHard() returns DATABASE_ERROR on non-P2025 failures', async () => {
      vi.spyOn(prisma.user, 'delete').mockRejectedValueOnce(new Error('boom'))
      expectErr(await UserRepository.deleteHard('u'), 'DATABASE_ERROR')
    })
  })
})
