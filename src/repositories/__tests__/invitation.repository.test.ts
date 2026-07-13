import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedInvitation } from '@/src/__tests__/factories/invitation.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
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
})
