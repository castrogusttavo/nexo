import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { projectMemberAlreadyExists } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectService } from '../project.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)

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

function projectWithDetails(over?: {
  leadId?: string
  isPublic?: boolean
  members?: { userId: string }[]
}) {
  return {
    ...createFakeProject({
      id: 'proj-id',
      workspaceId: 'ws1',
      slug: 'proj',
      leadId: over?.leadId ?? 'lead',
      isPublic: over?.isPublic ?? false,
    }),
    members: over?.members ?? [],
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
})

describe('ProjectService.listMembers()', () => {
  it('should return FORBIDDEN when actor is not a workspace member', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

    const result = await ProjectService.listMembers('actor', 'ws1', 'proj')

    expectErr(result, 'FORBIDDEN')
  })

  it('should return PROJECT_FORBIDDEN for a plain member of a private project', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(plainMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails({ leadId: 'someone-else', members: [] })),
    )

    const result = await ProjectService.listMembers('actor', 'ws1', 'proj')

    expectErr(result, 'PROJECT_FORBIDDEN')
  })

  it('should list members with the lead flagged', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails({ leadId: 'lead' })),
    )
    mockedProject.listMembers.mockResolvedValue(
      ok([memberWithUser('lead'), memberWithUser('u2')]),
    )

    const result = await ProjectService.listMembers('actor', 'ws1', 'proj')

    const dtos = expectOk(result)
    expect(dtos).toHaveLength(2)
    expect(dtos.find((m) => m.userId === 'lead')?.isLead).toBe(true)
    expect(dtos.find((m) => m.userId === 'u2')?.isLead).toBe(false)
  })
})

describe('ProjectService.addMember()', () => {
  it('should return PROJECT_FORBIDDEN when actor neither privileged nor lead', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(plainMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails({ leadId: 'someone-else' })),
    )

    const result = await ProjectService.addMember(
      'actor',
      'ws1',
      'proj',
      'target',
    )

    expectErr(result, 'PROJECT_FORBIDDEN')
    expect(mockedProject.addMember).not.toHaveBeenCalled()
  })

  it('should return PROJECT_MEMBER_NOT_IN_WORKSPACE when a target is not a workspace member', async () => {
    mockedMembership.findByUserAndWorkspace
      .mockResolvedValueOnce(ok(ownerMembership))
      .mockResolvedValueOnce(ok(null))
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )

    const result = await ProjectService.addMember(
      'actor',
      'ws1',
      'proj',
      'target',
    )

    expectErr(result, 'PROJECT_MEMBER_NOT_IN_WORKSPACE')
  })

  it('should let the lead add a member', async () => {
    mockedMembership.findByUserAndWorkspace
      .mockResolvedValueOnce(ok(plainMembership))
      .mockResolvedValueOnce(
        ok(createFakeMembership({ userId: 'target', workspaceId: 'ws1' })),
      )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails({ leadId: 'actor' })),
    )
    mockedProject.addMember.mockResolvedValue(ok(memberWithUser('target')))

    const result = await ProjectService.addMember(
      'actor',
      'ws1',
      'projt',
      'target',
    )

    const dto = expectOk(result)
    expect(dto.userId).toBe('target')
    expect(mockedProject.addMember).toHaveBeenCalledWith('target', 'proj-id')
  })

  it('should propagate PROJECT_MEMBER_ALREADY_EXISTS from the repository', async () => {
    mockedMembership.findByUserAndWorkspace
      .mockResolvedValueOnce(ok(ownerMembership))
      .mockResolvedValueOnce(
        ok(createFakeMembership({ userId: 'target', workspaceId: 'ws1' })),
      )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails()),
    )
    mockedProject.addMember.mockResolvedValue(err(projectMemberAlreadyExists()))

    const result = await ProjectService.addMember(
      'actor',
      'ws1',
      'proj',
      'target',
    )

    expectErr(result, 'PROJECT_MEMBER_ALREADY_EXISTS')
  })
})

describe('ProjectService.removeMember()', () => {
  it('should refuse to remove the project lead', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails({ leadId: 'lead' })),
    )

    const result = await ProjectService.removeMember(
      'actor',
      'ws1',
      'proj',
      'lead',
    )

    expectErr(result, 'PROJECT_FORBIDDEN')
    expect(mockedProject.removeMember).not.toHaveBeenCalled()
  })

  it('should remove a member', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(ownerMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWithDetails({ leadId: 'lead' })),
    )
    mockedProject.removeMember.mockResolvedValue(ok(undefined))

    const result = await ProjectService.removeMember(
      'actor',
      'ws1',
      'proj',
      'u2',
    )

    expectOk(result)
    expect(mockedProject.removeMember).toHaveBeenCalledWith('u2', 'proj-id')
  })
})
