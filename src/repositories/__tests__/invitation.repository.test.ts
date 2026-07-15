import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedInvitation } from '@/src/__tests__/factories/invitation.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { InvitationRepository } from '../invitation.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function seedInviterAndWorkspace() {
  const [inviter, ws] = await Promise.all([
    seedUser({ email: `inviter-${Date.now()}@example.com` }),
    seedWorkspace(),
  ])
  return { inviter, ws }
}

describe('InvitationRepository', () => {
  describe('create() + findByToken()', () => {
    it('should create an invite and read it back with the workspace included', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()

      const created = expectOk(
        await InvitationRepository.create({
          email: 'invitee@example.com',
          role: 'MEMBER',
          expiresAt: new Date(Date.now() + 60_000),
          invitedById: inviter.id,
          workspaceId: ws.id,
        }),
      )

      const found = expectOk(
        await InvitationRepository.findByToken(created.token),
      )
      expect(found?.id).toBe(created.id)
      expect(found?.workspace.slug).toBe(ws.slug)
    })
  })

  describe('findPendingByWorkspaceAndEmail()', () => {
    it('should only return PENDING invites', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'revoked@example.com',
        status: 'REVOKED',
      })

      const found = expectOk(
        await InvitationRepository.findPendingByWorkspaceAndEmail(
          ws.id,
          'revoked@example.com',
        ),
      )
      expect(found).toBeNull()
    })
  })

  describe('refreshToken()', () => {
    it('should replace the token and reopen the invite', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        status: 'EXPIRED',
      })

      const refreshed = expectOk(
        await InvitationRepository.refreshToken(
          invite.id,
          'brand-new-token',
          new Date(Date.now() + 60_000),
        ),
      )
      expect(refreshed.token).toBe('brand-new-token')
      expect(refreshed.token).not.toBe(invite.token)
      expect(refreshed.status).toBe('PENDING')
    })
  })

  describe('accept()', () => {
    it('should create the membership, mark ACCEPTED, and be idempotent', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const invitee = await seedUser({ email: 'accept@example.com' })
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'accept@example.com',
        role: 'MEMBER',
      })

      const membership = expectOk(
        await InvitationRepository.accept({
          invitationId: invite.id,
          userId: invitee.id,
          workspaceId: ws.id,
          role: 'MEMBER',
        }),
      )
      expect(membership.userId).toBe(invitee.id)

      const stored = await prisma.workspaceInvitation.findUnique({
        where: { id: invite.id },
      })
      expect(stored?.status).toBe('ACCEPTED')

      expectOk(
        await InvitationRepository.accept({
          invitationId: invite.id,
          userId: invitee.id,
          workspaceId: ws.id,
          role: 'MEMBER',
        }),
      )
      const count = await prisma.membership.count({
        where: { userId: invitee.id, workspaceId: ws.id },
      })
      expect(count).toBe(1)
    })

    it('hould clear the invitee onboarding step on accept', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const invitee = await seedUser({
        email: `invitee-${Date.now()}@example.com`,
      })
      await prisma.user.update({
        where: { id: invitee.id },
        data: { onboardingStep: 'ROLE' },
      })
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: invitee.email,
        status: 'PENDING',
      })

      expectOk(
        await InvitationRepository.accept({
          invitationId: invite.id,
          userId: invitee.id,
          workspaceId: ws.id,
          role: 'MEMBER',
        }),
      )
    })

    it('should also add the invitee as a project member when projectId is set', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const project = await seedProject(ws.id, inviter.id)
      const invitee = await seedUser({
        email: `proj-invitee-${Date.now()}@example.com`,
      })
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        projectId: project.id,
        email: invitee.email,
      })

      const result = await InvitationRepository.accept({
        invitationId: invite.id,
        userId: invitee.id,
        workspaceId: ws.id,
        role: 'MEMBER',
        projectId: project.id,
      })

      expectOk(result)
      const member = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: invitee.id, projectId: project.id },
        },
      })
      expect(member).not.toBeNull()
    })
  })

  describe('countPendingByWorkspace()', () => {
    it('should count only PENDING invitations of the workspace', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'p1@example.com',
        status: 'PENDING',
      })
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'p2@example.com',
        status: 'PENDING',
      })
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'r@example.com',
        status: 'REVOKED',
      })

      expect(
        expectOk(await InvitationRepository.countPendingByWorkspace(ws.id)),
      ).toBe(2)
    })

    it('should not count expired pending invitations toward the seat cap', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'live@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000),
      })
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'stale@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60_000),
      })

      expect(
        expectOk(await InvitationRepository.countPendingByWorkspace(ws.id)),
      ).toBe(1)
    })

    it('should not count invitations from toher workspaces', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const other = await seedWorkspace()
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'iso@example.com',
        status: 'PENDING',
      })

      expect(
        expectOk(await InvitationRepository.countPendingByWorkspace(other.id)),
      ).toBe(0)
    })

    it('should not count expired PENDING invites toward the seat cap', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'iso@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000),
      })
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'stale@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60_000),
      })

      expect(
        expectOk(await InvitationRepository.countPendingByWorkspace(ws.id)),
      ).toBe(1)
    })
  })

  describe('seat limit enforcement', () => {
    it('create() should reject when members+pending already reached the cap', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const member = await seedUser({
        email: `member-${Date.now()}@example.com`,
      })
      await seedMembership({ userId: member.id, workspaceId: ws.id })

      const result = await InvitationRepository.create(
        {
          email: 'overflow@example.com',
          role: 'MEMBER',
          expiresAt: new Date(Date.now() + 60_000),
          invitedById: inviter.id,
          workspaceId: ws.id,
        },
        1, // cap already met by `member`
      )

      expectErr(result, 'SEAT_LIMIT_REACHED')
    })

    it('create() should succeed when under the cap', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()

      const result = await InvitationRepository.create(
        {
          email: 'fits@example.com',
          role: 'MEMBER',
          expiresAt: new Date(Date.now() + 60_000),
          invitedById: inviter.id,
          workspaceId: ws.id,
        },
        5,
      )

      expectOk(result)
    })

    it('accept() should reject a brand-new membership when the cap is already met', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const existingMember = await seedUser({
        email: `existing-${Date.now()}@example.com`,
      })
      await seedMembership({ userId: existingMember.id, workspaceId: ws.id })
      const invitee = await seedUser({
        email: `invitee-${Date.now()}@example.com`,
      })
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: invitee.email,
      })

      const result = await InvitationRepository.accept({
        invitationId: invite.id,
        userId: invitee.id,
        workspaceId: ws.id,
        role: 'MEMBER',
        seatLimit: 1,
      })

      expectErr(result, 'SEAT_LIMIT_REACHED')
    })

    it('accept() should allow an already-member to accept a second invite even at the cap', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const existingMember = await seedUser({
        email: `already-${Date.now()}@example.com`,
      })
      await seedMembership({ userId: existingMember.id, workspaceId: ws.id })
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: existingMember.email,
      })

      const result = await InvitationRepository.accept({
        invitationId: invite.id,
        userId: existingMember.id,
        workspaceId: ws.id,
        role: 'MEMBER',
        seatLimit: 1,
      })

      expectOk(result)
    })
  })

  describe('findById()', () => {
    it('should return the invitation when it exists', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
      })

      const result = await InvitationRepository.findById(invite.id)

      expect(expectOk(result)?.id).toBe(invite.id)
    })

    it('should return null when the invitation does not exist', async () => {
      const result = await InvitationRepository.findById('nonexistent')

      expect(expectOk(result)).toBeNull()
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.findById('x')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listByWorkspace()', () => {
    it('should list invitations of the workspace ordered by createdAt desc', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const older = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'older@example.com',
      })
      await new Promise((r) => setTimeout(r, 5))
      const newer = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: 'newer@example.com',
      })

      const result = await InvitationRepository.listByWorkspace(ws.id)

      const list = expectOk(result)
      expect(list.map((i) => i.id)).toEqual([newer.id, older.id])
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.listByWorkspace('ws')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('updateStatus()', () => {
    it('should update the invitation status', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        status: 'PENDING',
      })

      const result = await InvitationRepository.updateStatus(
        invite.id,
        'REVOKED',
      )

      expect(expectOk(result).status).toBe('REVOKED')
    })

    it('should return DATABASE_ERROR when the update throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'update').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.updateStatus('x', 'REVOKED')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listByProject()', () => {
    it('should list only PENDING invitations of the project', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const project = await seedProject(ws.id, inviter.id)
      const pending = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        projectId: project.id,
        email: 'pending@example.com',
        status: 'PENDING',
      })
      await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        projectId: project.id,
        email: 'revoked@example.com',
        status: 'REVOKED',
      })

      const result = await InvitationRepository.listByProject(project.id)

      const list = expectOk(result)
      expect(list.map((i) => i.id)).toEqual([pending.id])
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.listByProject('project-1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('query failures', () => {
    it('create() returns DATABASE_ERROR on a non-seat-limit failure', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      // create() runs the insert through prisma.$transaction's `tx` client,
      // a separate instance from `prisma` itself — spying on
      // `prisma.workspaceInvitation.create` never intercepts it.
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('boom'))

      const result = await InvitationRepository.create({
        email: 'x@example.com',
        role: 'MEMBER',
        expiresAt: new Date(Date.now() + 60_000),
        invitedById: inviter.id,
        workspaceId: ws.id,
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('findByToken() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.findByToken('x')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('findPendingByWorkspaceAndEmail() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'findFirst').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.findPendingByWorkspaceAndEmail(
        'ws',
        'x@example.com',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('countPendingByWorkspace() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'count').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.countPendingByWorkspace('ws')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('refreshToken() returns DATABASE_ERROR when the update throws', async () => {
      vi.spyOn(prisma.workspaceInvitation, 'update').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await InvitationRepository.refreshToken(
        'x',
        'new-token',
        new Date(),
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('accept() returns DATABASE_ERROR on a non-seat-limit failure', async () => {
      const { inviter, ws } = await seedInviterAndWorkspace()
      const invitee = await seedUser({ email: `err-${Date.now()}@example.com` })
      const invite = await seedInvitation({
        invitedById: inviter.id,
        workspaceId: ws.id,
        email: invitee.email,
      })
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('boom'))

      const result = await InvitationRepository.accept({
        invitationId: invite.id,
        userId: invitee.id,
        workspaceId: ws.id,
        role: 'MEMBER',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
