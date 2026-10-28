import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { createFakeInvitation } from '@/src/__tests__/factories/invitation.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { sendInviteUserToWorkspaceEmail } from '@/src/lib/mail/workspace/send-invite-user-to-workspace'
import { err, ok, type Result } from '@/src/lib/result'
import { InvitationRepository } from '@/src/repositories/invitation.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { UserRepository } from '@/src/repositories/user.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { InvitationService } from '@/src/services/invitation.service'

vi.mock('@/src/cache/user.cache')
vi.mock('@/src/repositories/invitation.repository')
vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))
vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/lib/mail/workspace/send-invite-user-to-workspace')

const mockedInvite = vi.mocked(InvitationRepository)
const mockedMembership = vi.mocked(MembershipRepository)
const mockedUser = vi.mocked(UserRepository)
const mockedWorkspace = vi.mocked(WorkspaceRepository)
const mockedEmail = vi.mocked(sendInviteUserToWorkspaceEmail)
const mockedProject = vi.mocked(ProjectRepository)

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
        expect.anything(),
      )
      expect(mockedEmail).toHaveBeenCalledTimes(1)
    })

    it('should set the invite to expire 7 days in the future', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedInvite.create.mockResolvedValue(
        ok(createFakeInvitation({ workspaceId: 'ws1' })),
      )

      await InvitationService.create('actor', 'ws1', {
        email: 'ttl@example.com',
        role: 'MEMBER',
      })

      const TTL_MS = 7 * 24 * 60 * 60 * 1000
      const [payload] = mockedInvite.create.mock.calls[0]
      const ttl = payload.expiresAt.getTime() - Date.now()
      // A sign slip would persist an invite that is already expired, so the
      // link would be dead the moment it reaches the invitee's inbox.
      expect(ttl).toBeGreaterThan(TTL_MS - 60_000)
      expect(ttl).toBeLessThanOrEqual(TTL_MS)
    })

    it('should normalize the invited email before looking it up and storing it', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedInvite.create.mockResolvedValue(
        ok(createFakeInvitation({ workspaceId: 'ws1' })),
      )

      await InvitationService.create('actor', 'ws1', {
        email: '  New.Person@Example.COM  ',
        role: 'MEMBER',
      })

      // Without the trim/lowercase the padded address would dodge both the
      // already-member and the duplicate-invite checks, and land in the DB
      // as a distinct address from the same person's real one.
      expect(mockedUser.findByEmail).toHaveBeenCalledWith(
        'new.person@example.com',
      )
      expect(mockedInvite.findPendingByWorkspaceAndEmail).toHaveBeenCalledWith(
        'ws1',
        'new.person@example.com',
      )
      expect(mockedInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new.person@example.com' }),
        expect.anything(),
      )
    })

    it('should expire a stale pending invite and create a new one', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(
        ok(
          createFakeInvitation({
            id: 'stale',
            status: 'PENDING',
            expiresAt: new Date(Date.now() - 1000),
          }),
        ),
      )
      mockedInvite.create.mockResolvedValue(
        ok(createFakeInvitation({ email: 'new@example.com' })),
      )

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'MEMBER',
      })

      expectOk(result)
      expect(mockedInvite.updateStatus).toHaveBeenCalledWith('stale', 'EXPIRED')
      expect(mockedInvite.create).toHaveBeenCalled()
    })

    it('should still create the invite when the notification email fails to send', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedInvite.create.mockResolvedValue(
        ok(createFakeInvitation({ email: 'new@example.com' })),
      )
      mockedEmail.mockRejectedValue(new Error('smtp down'))

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'MEMBER',
      })

      expectOk(result)
      expect(vi.mocked(logger).warn).toHaveBeenCalledWith(
        'invitation.email_failed',
        expect.objectContaining({ workspaceId: 'ws1' }),
      )
    })
  })

  describe('list()', () => {
    it('should return invitations for a privileged actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.listByWorkspace.mockResolvedValue(
        ok([createFakeInvitation({ workspaceId: 'ws1' })]),
      )

      const result = await InvitationService.list('actor', 'ws1')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return FORBIDDEN when actor is not privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMebership),
      )

      const result = await InvitationService.list('actor', 'ws1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedInvite.listByWorkspace).not.toHaveBeenCalled()
    })
  })

  describe('updateRole()', () => {
    it('should update the role of a pending invite', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(
          createFakeInvitation({
            id: 'inv-1',
            workspaceId: 'ws1',
            status: 'PENDING',
            role: 'MEMBER',
          }),
        ),
      )
      mockedInvite.updateRole.mockResolvedValue(
        ok(createFakeInvitation({ id: 'inv-1', role: 'ADMIN' })),
      )

      const result = await InvitationService.updateRole(
        'actor',
        'ws1',
        'inv-1',
        'ADMIN',
      )

      expect(expectOk(result).role).toBe('ADMIN')
    })

    it('should return FORBIDDEN when actor is not privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMebership),
      )

      const result = await InvitationService.updateRole(
        'actor',
        'ws1',
        'inv-1',
        'ADMIN',
      )

      expectErr(result, 'FORBIDDEN')
      expect(mockedInvite.findById).not.toHaveBeenCalled()
    })

    it('should return INVITATION_NOT_FOUND when invite belongs to another workspace', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(createFakeInvitation({ workspaceId: 'other-ws' })),
      )

      const result = await InvitationService.updateRole(
        'actor',
        'ws1',
        'inv-1',
        'ADMIN',
      )

      expectErr(result, 'INVITATION_NOT_FOUND')
    })

    it('should return INVITATION_NOT_PENDING when the invite is no longer pending', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(
          createFakeInvitation({
            workspaceId: 'ws1',
            status: 'ACCEPTED',
          }),
        ),
      )

      const result = await InvitationService.updateRole(
        'actor',
        'ws1',
        'inv-1',
        'ADMIN',
      )

      expectErr(result, 'INVITATION_NOT_PENDING')
      expect(mockedInvite.updateRole).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(createFakeInvitation({ workspaceId: 'ws1', status: 'PENDING' })),
      )
      mockedInvite.updateRole.mockResolvedValue(err(databaseError()))

      const result = await InvitationService.updateRole(
        'actor',
        'ws1',
        'inv-1',
        'ADMIN',
      )

      expectErr(result, 'DATABASE_ERROR')
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

    it('should accept when the actor email only differs by surrounding whitespace', async () => {
      mockedInvite.findByToken.mockResolvedValue(ok(pendingInvite))
      mockedInvite.accept.mockResolvedValue(
        ok(createFakeMembership({ userId: 'user', workspaceId: 'ws1' })),
      )

      const result = await InvitationService.accept(
        'user',
        '  invitee@example.com ',
        'tok',
      )

      // Sessions can carry a padded address; without the trim the invitee
      // would be locked out of their own invitation.
      expectOk(result)
      expect(mockedInvite.accept).toHaveBeenCalled()
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

    it('should return INVITATION_NOT_PENDING when the invite was already revoked', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(
          createFakeInvitation({
            id: 'inv1',
            workspaceId: 'ws1',
            status: 'REVOKED',
          }),
        ),
      )

      const result = await InvitationService.revoke('actor', 'ws1', 'inv1')

      expectErr(result, 'INVITATION_NOT_PENDING')
      expect(mockedInvite.updateStatus).not.toHaveBeenCalled()
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

    it('should return INVITATION_NOT_PENDING when the invite was already accepted', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedInvite.findById.mockResolvedValue(
        ok(
          createFakeInvitation({
            id: 'inv1',
            workspaceId: 'ws1',
            status: 'ACCEPTED',
          }),
        ),
      )

      const result = await InvitationService.resend('actor', 'ws1', 'inv1')

      expectErr(result, 'INVITATION_NOT_PENDING')
      expect(mockedInvite.refreshToken).not.toHaveBeenCalled()
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

    it('should propagate a workspace lookup error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedWorkspace.findById.mockResolvedValue(err(databaseError()))

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate a member count error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedMembership.countByWorkspace.mockResolvedValue(err(databaseError()))

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate a pending invite count error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedInvite.countPendingByWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await InvitationService.create('actor', 'ws1', {
        email: 'new@example.com',
        role: 'MEMBER',
      })

      expectErr(result, 'DATABASE_ERROR')
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
      expect(mockedInvite.create).toHaveBeenCalledWith(expect.anything(), null)
    })
  })

  describe('guard propagation', () => {
    const dbFail = err(databaseError('boom'))
    const wsInvite = createFakeInvitation({
      id: 'inv-1',
      workspaceId: 'ws1',
      projectId: 'proj-id',
      status: 'PENDING',
    })

    function asOwner() {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedUser.findByEmail.mockResolvedValue(ok(null))
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
      mockedInvite.create.mockResolvedValue(ok(wsInvite))
      mockedInvite.findById.mockResolvedValue(ok(wsInvite))
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({
          ...createFakeProject({
            id: 'proj-id',
            workspaceId: 'ws1',
            slug: 'proj',
            leadId: 'lead',
          }),
          members: [],
          favourites: [],
        } as never),
      )
    }

    const workspaceScoped = {
      create: () =>
        InvitationService.create('actor', 'ws1', {
          email: 'new@example.com',
          role: 'MEMBER',
        }),
      list: () => InvitationService.list('actor', 'ws1'),
      revoke: () => InvitationService.revoke('actor', 'ws1', 'inv-1'),
      resend: () => InvitationService.resend('actor', 'ws1', 'inv-1'),
      updateRole: () =>
        InvitationService.updateRole('actor', 'ws1', 'inv-1', 'ADMIN'),
    }
    const projectScoped = {
      createForProject: () =>
        InvitationService.createForProject('actor', 'ws1', 'proj', {
          email: 'new@example.com',
          role: 'MEMBER',
        }),
      listForProject: () =>
        InvitationService.listForProject('actor', 'ws1', 'proj'),
      revokeForProject: () =>
        InvitationService.revokeForProject('actor', 'ws1', 'proj', 'inv-1'),
      resendForProject: () =>
        InvitationService.resendForProject('actor', 'ws1', 'proj', 'inv-1'),
    }
    const all = { ...workspaceScoped, ...projectScoped }

    function expectNoWrite() {
      expect(mockedInvite.create).not.toHaveBeenCalled()
      expect(mockedInvite.updateStatus).not.toHaveBeenCalled()
      expect(mockedInvite.refreshToken).not.toHaveBeenCalled()
      expect(mockedInvite.updateRole).not.toHaveBeenCalled()
      expect(mockedProject.addMember).not.toHaveBeenCalled()
      expect(auditMutation).not.toHaveBeenCalled()
    }

    it.each(
      Object.keys(all) as (keyof typeof all)[],
    )('%s() propagates a failing actor membership lookup and stops', async (method) => {
      asOwner()
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expect(mockedInvite.findById).not.toHaveBeenCalled()
      expect(mockedProject.findByWorkspaceAndSlug).not.toHaveBeenCalled()
      expectNoWrite()
    })

    it.each(
      Object.keys(projectScoped) as (keyof typeof projectScoped)[],
    )('%s() propagates a failing project lookup and stops', async (method) => {
      asOwner()
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(dbFail)

      expectErr(await projectScoped[method](), 'DATABASE_ERROR')
      expect(mockedInvite.findById).not.toHaveBeenCalled()
      expect(mockedInvite.listByProject).not.toHaveBeenCalled()
      expectNoWrite()
    })

    it.each([
      'revoke',
      'resend',
      'updateRole',
      'revokeForProject',
      'resendForProject',
    ] as const)('%s() propagates a failing invitation lookup and stops', async (method) => {
      asOwner()
      mockedInvite.findById.mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expectNoWrite()
    })

    it.each([
      'create',
      'createForProject',
    ] as const)('%s() propagates a failing findByEmail and stops', async (method) => {
      asOwner()
      mockedUser.findByEmail.mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expect(mockedInvite.findPendingByWorkspaceAndEmail).not.toHaveBeenCalled()
      expectNoWrite()
    })

    it.each([
      'create',
      'createForProject',
    ] as const)('%s() propagates a failing target membership lookup and stops', async (method) => {
      asOwner()
      mockedUser.findByEmail.mockResolvedValue(
        ok(createFakeUser({ id: 'target' })),
      )
      mockedMembership.findByUserAndWorkspace
        .mockResolvedValueOnce(ok(ownerMembership))
        .mockResolvedValueOnce(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expect(mockedInvite.findPendingByWorkspaceAndEmail).not.toHaveBeenCalled()
      expectNoWrite()
    })

    it.each([
      'create',
      'createForProject',
    ] as const)('%s() invites an existing user who is not a workspace member yet', async (method) => {
      asOwner()
      mockedUser.findByEmail.mockResolvedValue(
        ok(createFakeUser({ id: 'target' })),
      )
      mockedMembership.findByUserAndWorkspace
        .mockResolvedValueOnce(ok(ownerMembership))
        .mockResolvedValueOnce(ok(null))

      const result: Result<unknown> = await all[method]()
      expectOk(result)
      expect(mockedProject.addMember).not.toHaveBeenCalled()
      expect(mockedInvite.create).toHaveBeenCalledOnce()
    })

    it.each([
      'create',
      'createForProject',
    ] as const)('%s() propagates a failing pending-invite lookup and stops', async (method) => {
      asOwner()
      mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expect(mockedWorkspace.findById).not.toHaveBeenCalled()
      expectNoWrite()
    })

    it.each([
      'create',
      'createForProject',
    ] as const)('%s() propagates a failing insert and sends no email', async (method) => {
      asOwner()
      mockedInvite.create.mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expect(mockedEmail).not.toHaveBeenCalled()
      expect(auditMutation).not.toHaveBeenCalled()
    })

    it('createForProject() propagates a failing addMember and does not audit', async () => {
      asOwner()
      mockedUser.findByEmail.mockResolvedValue(
        ok(createFakeUser({ id: 'target' })),
      )
      mockedMembership.findByUserAndWorkspace
        .mockResolvedValueOnce(ok(ownerMembership))
        .mockResolvedValueOnce(ok(memberMebership))
      mockedProject.addMember.mockResolvedValue(dbFail)

      expectErr(await projectScoped.createForProject(), 'DATABASE_ERROR')
      expect(mockedInvite.create).not.toHaveBeenCalled()
      expect(auditMutation).not.toHaveBeenCalled()
    })

    it.each([
      ['list', 'listByWorkspace'],
      ['listForProject', 'listByProject'],
    ] as const)('%s() propagates a failing %s', async (method, repoMethod) => {
      asOwner()
      mockedInvite[repoMethod].mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
    })

    it.each([
      ['revoke', 'updateStatus'],
      ['revokeForProject', 'updateStatus'],
      ['resend', 'refreshToken'],
      ['resendForProject', 'refreshToken'],
    ] as const)('%s() propagates a failing %s and does not audit', async (method, repoMethod) => {
      asOwner()
      mockedInvite[repoMethod].mockResolvedValue(dbFail)

      expectErr(await all[method](), 'DATABASE_ERROR')
      expect(mockedEmail).not.toHaveBeenCalled()
      expect(auditMutation).not.toHaveBeenCalled()
    })

    it('skips the email but still creates the invite when the inviter lookup fails', async () => {
      asOwner()
      mockedUser.findById.mockResolvedValue(dbFail)

      expectOk(await workspaceScoped.create())
      expect(mockedEmail).not.toHaveBeenCalled()
      expect(auditMutation).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', targetId: 'inv-1' }),
      )
    })

    it('logs "unknown" when the email transport throws a non-Error', async () => {
      asOwner()
      mockedEmail.mockRejectedValue('smtp offline')

      expectOk(await workspaceScoped.create())
      expect(vi.mocked(logger).warn).toHaveBeenCalledWith(
        'invitation.email_failed',
        expect.objectContaining({ error: 'unknown' }),
      )
    })
  })

  describe('accept() guard propagation', () => {
    const invite = {
      ...createFakeInvitation({
        workspaceId: 'ws1',
        email: 'invitee@example.com',
        status: 'PENDING',
      }),
      workspace: createFakeWorkspace({ id: 'ws1', slug: 'acme' }),
    }

    it('propagates a failing token lookup', async () => {
      mockedInvite.findByToken.mockResolvedValue(err(databaseError('boom')))

      expectErr(
        await InvitationService.accept('user', 'invitee@example.com', 'tok'),
        'DATABASE_ERROR',
      )
      expect(mockedInvite.accept).not.toHaveBeenCalled()
    })

    it('answers INVITATION_EXPIRED for an invite already flagged EXPIRED', async () => {
      mockedInvite.findByToken.mockResolvedValue(
        ok({ ...invite, status: 'EXPIRED' }),
      )

      expectErr(
        await InvitationService.accept('user', 'invitee@example.com', 'tok'),
        'INVITATION_EXPIRED',
      )
      expect(mockedInvite.updateStatus).not.toHaveBeenCalled()
      expect(mockedInvite.accept).not.toHaveBeenCalled()
    })

    it('propagates a failing accept write and does not audit', async () => {
      mockedInvite.findByToken.mockResolvedValue(ok(invite))
      mockedInvite.accept.mockResolvedValue(err(databaseError('boom')))

      expectErr(
        await InvitationService.accept('user', 'invitee@example.com', 'tok'),
        'DATABASE_ERROR',
      )
      expect(auditMutation).not.toHaveBeenCalled()
    })
  })
})
