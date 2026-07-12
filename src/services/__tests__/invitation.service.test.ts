import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeInvitation } from '@/src/__tests__/factories/invitation.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { sendInviteUserToWorkspaceEmail } from '@/src/lib/mail/workspace/send-invite-user-to-workspace'
import { ok } from '@/src/lib/result'
import { InvitationRepository } from '@/src/repositories/invitation.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { UserRepository } from '@/src/repositories/user.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { InvitationService } from '@/src/services/invitation.service'

vi.mock('@/src/cache/user.cache')
vi.mock('@/src/repositories/invitation.repository')
vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/lib/mail/workspace/send-invite-user-to-workspace')

const mockedInvite = vi.mocked(InvitationRepository)
const mockedMembership = vi.mocked(MembershipRepository)
const mockedUser = vi.mocked(UserRepository)
const mockedWorkspace = vi.mocked(WorkspaceRepository)
const mockedEmail = vi.mocked(sendInviteUserToWorkspaceEmail)

const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})

const memberMebership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

beforeEach(() => {
  vi.clearAllMocks()
  // Defaults for the email dispatch dependencies (happy path)
  mockedUser.findById.mockResolvedValue(ok(createFakeUser({ id: 'actor' })))
  mockedWorkspace.findById.mockResolvedValue(
    ok(createFakeWorkspace({ id: 'ws1', slug: 'acme' })),
  )
  mockedEmail.mockResolvedValue({ id: 'email-1' } as never)
  mockedMembership.countByWorkspace.mockResolvedValue(ok(0))
  mockedInvite.countPendingByWorkspace.mockResolvedValue(ok(0))
})

describe('InvitationService', () => {
  describe('create()', () => {
    it('should return FORBIDDEN when actor is not privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMebership),
      )

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'FORBIDDEN')
      expect(mockedInvite.create).not.toHaveBeenCalledWith()
    })

    it('should return INVITATION_ALREADY_MEMBER when email is already a member', async () => {
      mockedMembership.findByUserAndWorkspace
        .mockResolvedValueOnce(ok(ownerMembership)) // actor privilege check
        .mockResolvedValueOnce(ok(memberMebership)) // actor privilege check
      mockedUser.findByEmail.mockResolvedValue(
        ok(createFakeUser({ id: 'target' })),
      )

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'dup@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'INVITATION_ALREADY_MEMBER')
    })

    it('should return INVITATION_DUPLICATE when a pending invite exists', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(
        ok(createFakeInvitation({ status: 'PENDING' })),
      )

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'pending@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'INVITATION_DUPLICATE')
    })

    it('should create the invite and dispatch the email', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      const invitation = createFakeInvitation({
        workspaceId: 'ws1',
        email: 'new@example.com',
        role: 'ADMIN',
      })
      mockedInvite.create.mockResolvedValue(ok(invitation))

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'ADMIN',
      })

      const dto = expectOk(result)
      expect(dto.email).toBe(invitation.email)
      expect(mockedInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          role: 'ADMIN',
          invitedById: 'actor',
          workspaceId: 'ws1',
          projectId: null,
        }),
      )
      expect(mockedEmail).toHaveBeenCalledTimes(1)
    })
  })

  describe('accept()', () => {
    const pendingInvite = {
      ...createFakeInvitation({
        workspaceId: 'ws1',
        email: 'invitee@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        projectId: null,
      }),
      workspace: createFakeWorkspace({ id: 'ws1', slug: 'acme' }),
    }

    it('should return INVITATION_NOT_FOUND when already accepted', async () => {
      mockedInvite.findByToken.mockResolvedValue(ok(null))

      const result = await InvitationService.accept(
        'user',
        'invitee@example.com',
        'nope',
      )

      expectErr(result, 'INVITATION_NOT_FOUND')
    })

    it('should return INVITATION_NOT_PENDING when past expiry and flip status', async () => {
      mockedInvite.findByToken.mockResolvedValue(
        ok({ ...pendingInvite, status: 'ACCEPTED' }),
      )

      const result = await InvitationService.accept(
        'user',
        'invitee@example.com',
        'tok',
      )

      expectErr(result, 'INVITATION_NOT_PENDING')
    })

    it('should return INVITATION_EXPIRED when past expiry and flip status', async () => {
      mockedInvite.findByToken.mockResolvedValue(
        ok({ ...pendingInvite, expiresAt: new Date(Date.now() - 1000) }),
      )
      mockedInvite.updateStatus.mockResolvedValue(ok(pendingInvite))

      const result = await InvitationService.accept(
        'user',
        'invitee@example.com',
        'tok',
      )

      expectErr(result, 'INVITATION_EXPIRED')
      expect(mockedInvite.updateStatus).toHaveBeenCalledWith(
        pendingInvite.id,
        'EXPIRED',
      )
    })

    it('should return INVITATION_EMAIL_MISMATCH when emails differ', async () => {
      mockedInvite.findByToken.mockResolvedValue(ok(pendingInvite))

      const result = await InvitationService.accept(
        'user',
        'other@example.com',
        'tok',
      )

      expectErr(result, 'INVITATION_EMAIL_MISMATCH')
      expect(mockedInvite.accept).not.toHaveBeenCalled()
    })

    it('should accept and return the workspace slug', async () => {
      mockedInvite.findByToken.mockResolvedValue(ok(pendingInvite))
      mockedInvite.accept.mockResolvedValue(
        ok(createFakeMembership({ userId: 'user', workspaceId: 'ws1' })),
      )

      const result = await InvitationService.accept(
        'user',
        'INVITEE@example.com', // case-insensitive match
        'tok',
      )

      const value = expectOk(result)
      expect(value).toEqual({ workspaceId: 'ws1', slug: 'acme' })
      expect(mockedInvite.accept).toHaveBeenCalledWith(
        expect.objectContaining({
          invitationId: pendingInvite.id,
          userId: 'user',
          workspaceId: 'ws1',
          role: 'MEMBER',
          projectId: null,
        }),
      )
    })

    it('should return SEAT_LIMIT_REACHED when the workspace is full', async () => {
      mockedInvite.findByToken.mockResolvedValue(ok(pendingInvite as never))
      mockedMembership.countByWorkspace.mockResolvedValue(ok(12)) // FREE cap

      const result = await InvitationService.accept(
        'user',
        'invitee@example.com',
        pendingInvite.token,
      )

      expectErr(result, 'SEAT_LIMIT_REACHED')
      expect(mockedInvite.accept).not.toHaveBeenCalled()
    })
  })

  describe('revoke()', () => {
    it('should return INVITATION_NOT_FOUND when invite belongs to another workspace', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(createFakeInvitation({ workspaceId: 'other-ws' })),
      )

      const result = await InvitationService.revoke('actor', 'ws1', 'inv1')

      expectErr(result, 'INVITATION_NOT_FOUND')
    })

    it('should revoke a pending invite', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      const invite = createFakeInvitation({
        id: 'inv1',
        workspaceId: 'ws1',
        status: 'PENDING',
      })
      mockedInvite.findById.mockResolvedValue(ok(invite))
      mockedInvite.updateStatus.mockResolvedValue(
        ok({ ...invite, status: 'REVOKED' }),
      )

      const result = await InvitationService.revoke('actor', 'ws1', 'inv1')

      const dto = expectOk(result)
      expect(dto.status).toBe('REVOKED')
      expect(mockedInvite.updateStatus).toHaveBeenCalledWith('inv1', 'REVOKED')
    })
  })

  describe('resend()', () => {
    it('should rotate the token and dispatch a new email', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      const invite = createFakeInvitation({
        id: 'inv1',
        workspaceId: 'ws1',
        status: 'PENDING',
        token: 'old-token',
      })
      mockedInvite.findById.mockResolvedValue(ok(invite))
      mockedInvite.refreshToken.mockResolvedValue(
        ok({ ...invite, token: 'new-token' }),
      )

      const result = await InvitationService.resend('actor', 'ws1', 'inv1')

      expectOk(result)
      expect(mockedInvite.refreshToken).toHaveBeenCalledWith(
        'inv1',
        expect.any(String),
        expect.any(Date),
      )
      expect(mockedEmail).toHaveBeenCalledTimes(1)
    })
  })

  describe('seat limit', () => {
    it('should return SEAT_LIMIT_REACHED on create when FREE cap is reached', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedMembership.countByWorkspace.mockResolvedValue(ok(12)) // FREE cap

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'overflow@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'SEAT_LIMIT_REACHED')
      expect(mockedInvite.create).not.toHaveBeenCalled()
    })

    it('should count members + pending invites together against the cap', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedMembership.countByWorkspace.mockResolvedValue(ok(10))
      mockedInvite.countPendingByWorkspace.mockResolvedValue(ok(2)) // 10 + 2 = 12

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'twelfth@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'SEAT_LIMIT_REACHED')
    })

    it('should allow create ona n unlimited (paid) plan', async () => {
      mockedWorkspace.findById.mockResolvedValue(
        ok(
          createFakeWorkspace({
            id: 'ws1',
            slug: 'acme',
            activePlan: 'PRO',
          }),
        ),
      )
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedMembership.countByWorkspace.mockResolvedValue(ok(9999))
      mockedInvite.create.mockResolvedValue(ok(createFakeInvitation()))

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'ok@example.com',
        role: 'MEMBER',
      })

      expectOk(result)
      expect(mockedInvite.create).toHaveBeenCalled()
    })
  })
})
