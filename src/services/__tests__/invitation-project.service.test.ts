import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeInvitation } from '@/src/__tests__/factories/invitation.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { sendInviteUserToWorkspaceEmail } from '@/src/lib/mail/workspace/send-invite-user-to-workspace'
import { ok } from '@/src/lib/result'
import { InvitationRepository } from '@/src/repositories/invitation.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { UserRepository } from '@/src/repositories/user.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { InvitationService } from '../invitation.service'

vi.mock('@/src/repositories/invitation.repository')
vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/user.repository')
vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/lib/mail/workspace/send-invite-user-to-workspace')

const mockedInvite = vi.mocked(InvitationRepository)
const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedUser = vi.mocked(UserRepository)
const mockedWorkspace = vi.mocked(WorkspaceRepository)
const mockedEmail = vi.mocked(sendInviteUserToWorkspaceEmail)

const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})
const plainMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

function projectWithDetails(leadId = 'lead') {
  return {
    ...createFakeProject({
      id: 'proj-id',
      workspaceId: 'ws1',
      slug: 'proj',
      leadId,
    }),
    members: [] as { userId: string }[],
    favourites: [] as { id: string }[],
  }
}

function memberWithUser(userId: string) {
  return {
    id: `pm-${userId}`,
    userId,
    projectId: 'proj-id',
    createdAt: new Date(),
    user: { id: userId, name: 'Name', username: userId, image: null },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUser.findById.mockResolvedValue(ok(createFakeUser({ id: 'actor' })))
  mockedWorkspace.findById.mockResolvedValue(
    ok(createFakeWorkspace({ id: 'ws1' })),
  )
  mockedEmail.mockResolvedValue({ id: 'email-1' } as never)
  mockedMembership.countByWorkspace.mockResolvedValue(ok(0))
  mockedInvite.countPendingByWorkspace.mockResolvedValue(ok(0))
})

describe('InvitationService.createForProject()', () => {
  it('should return FORBIDDEN when actor is not a workspace member', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

    const result = await InvitationService.createForProject(
      'actor',
      'ws1',
      'proj',
      { email: 'ext@example.com', role: 'MEMBER' },
    )

    expectErr(result, 'FORBIDDEN')
  })

  it('should return PROJECT_FORBIDDEN for a plain member who is not the lead', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(plainMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails('someone-else')),
    )

    const result = await InvitationService.createForProject(
      'actor',
      'ws1',
      'proj',
      { email: 'ext@example.com', role: 'MEMBER' },
    )

    expectErr(result, 'PROJECT_FORBIDDEN')
  })

  it('should add an existing workspace member directly to the project', async () => {
    mockedMembership.findByUserAndWorkspace
      .mockResolvedValueOnce(ok(ownerMembership)) // gate
      .mockResolvedValueOnce(
        ok(createFakeMembership({ userId: 'target', workspaceId: 'ws1' })),
      ) // target lookup
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedUser.findByEmail.mockResolvedValue(
      ok(createFakeUser({ id: 'target' })),
    )
    mockedProject.addMember.mockResolvedValue(ok(memberWithUser('target')))

    const result = await InvitationService.createForProject(
      'actor',
      'ws1',
      'proj',
      { email: 'target@example.com', role: 'MEMBER' },
    )

    const value = expectOk(result)
    expect(value.kind).toBe('added')
    expect(mockedProject.addMember).toHaveBeenCalledWith('target', 'proj-id')
    expect(mockedInvite.create).not.toHaveBeenCalled()
  })

  it('should invite an external email with the project attached', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedUser.findByEmail.mockResolvedValue(ok(null))
    mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(ok(null))
    mockedInvite.create.mockResolvedValue(
      ok(
        createFakeInvitation({
          projectId: 'proj-id',
          email: 'ext@example.com',
        }),
      ),
    )

    const result = await InvitationService.createForProject(
      'actor',
      'ws1',
      'proj',
      { email: 'ext@example.com', role: 'MEMBER' },
    )

    const value = expectOk(result)
    expect(value.kind).toBe('invited')
    expect(mockedInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ext@example.com',
        projectId: 'proj-id',
      }),
    )
    expect(mockedEmail).toHaveBeenCalledTimes(1)
  })

  it('should return INVITATION_DUPLICATE when a pending invite exists', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedUser.findByEmail.mockResolvedValue(ok(null))
    mockedInvite.findPendingByWorkspaceAndEmail.mockResolvedValue(
      ok(createFakeInvitation({ status: 'PENDING' })),
    )

    const result = await InvitationService.createForProject(
      'actor',
      'ws1',
      'proj',
      { email: 'ext@example.com', role: 'MEMBER' },
    )

    expectErr(result, 'INVITATION_DUPLICATE')
  })
})

describe('InvitationService.listForProject()', () => {
  it('should return the project pending invitations as DTOs', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedInvite.listByProject.mockResolvedValue(
      ok([createFakeInvitation({ projectId: 'proj-id' })]),
    )

    const result = await InvitationService.listForProject(
      'actor',
      'ws1',
      'proj',
    )

    expect(expectOk(result)).toHaveLength(1)
    expect(mockedInvite.listByProject).toHaveBeenCalledWith('proj-id')
  })
})

describe('InvitationService.revokeForProject()', () => {
  it('should return INVITATION_NOT_FOUND when the invite is from another project', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedInvite.findById.mockResolvedValue(
      ok(createFakeInvitation({ projectId: 'another-project' })),
    )

    const result = await InvitationService.revokeForProject(
      'actor',
      'ws1',
      'proj',
      'inv1',
    )

    expectErr(result, 'INVITATION_NOT_FOUND')
  })

  it('should revoke a pending project invite', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    const invite = createFakeInvitation({
      id: 'inv1',
      projectId: 'proj-id',
      status: 'PENDING',
    })
    mockedInvite.findById.mockResolvedValue(ok(invite))
    mockedInvite.updateStatus.mockResolvedValue(
      ok({ ...invite, status: 'REVOKED' }),
    )

    const result = await InvitationService.revokeForProject(
      'actor',
      'ws1',
      'proj',
      'inv1',
    )

    expect(expectOk(result).status).toBe('REVOKED')
    expect(mockedInvite.updateStatus).toHaveBeenCalledWith('inv1', 'REVOKED')
  })
})

describe('InvitationService.resendForProject()', () => {
  it('should return PROJECT_FORBIDDEN for a plain member who is not the lead', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(plainMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails('someone-else')),
    )

    const result = await InvitationService.resendForProject(
      'actor',
      'ws1',
      'proj',
      'inv1',
    )

    expectErr(result, 'PROJECT_FORBIDDEN')
    expect(mockedInvite.refreshToken).not.toHaveBeenCalled()
  })

  it('should return INVITATION_NOT_FOUND when the invite is from another project', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedInvite.findById.mockResolvedValue(
      ok(createFakeInvitation({ projectId: 'another-project' })),
    )

    const result = await InvitationService.resendForProject(
      'actor',
      'ws1',
      'proj',
      'inv1',
    )

    expectErr(result, 'INVITATION_NOT_FOUND')
  })

  it('should return INVITATION_NOT_PENDING when the invite was already accepted', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedInvite.findById.mockResolvedValue(
      ok(
        createFakeInvitation({
          id: 'inv1',
          projectId: 'another-project',
          status: 'ACCEPTED',
        }),
      ),
    )

    const result = await InvitationService.resendForProject(
      'actor',
      'ws1',
      'proj',
      'inv1',
    )

    expectErr(result, 'INVITATION_NOT_FOUND')
    expect(mockedInvite.refreshToken).not.toHaveBeenCalled()
  })

  it('should let the project rotate the token and dispatch a new email', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(plainMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails('actor')),
    )
    const invite = createFakeInvitation({
      id: 'inv1',
      projectId: 'proj-id',
      status: 'PENDING',
      token: 'old-token',
    })
    mockedInvite.findById.mockResolvedValue(ok(invite))
    mockedInvite.refreshToken.mockResolvedValue(
      ok({ ...invite, token: 'new-token' }),
    )

    const result = await InvitationService.resendForProject(
      'actor',
      'ws1',
      'proj',
      'inv1',
    )

    expectOk(result)
    expect(mockedInvite.refreshToken).toHaveBeenCalledWith(
      'inv1',
      expect.any(String),
      expect.any(Date),
    )
    expect(mockedEmail).toHaveBeenCalledTimes(1)
  })
})
