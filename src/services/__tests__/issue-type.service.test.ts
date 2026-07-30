import { describe, expect, it, vi } from 'vitest'
import { createFakeIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueTypeRepository } from '@/src/repositories/issue-type.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueTypeService } from '../issue-type.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue-type.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssueType = vi.mocked(IssueTypeRepository)

const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})
const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
  members: { userId: string }[] = [],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

describe('IssueTypeService', () => {
  describe('list()', () => {
    it('should return types as DTOs for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true }, [{ userId: 'actor' }])),
      )
      mockedIssueType.listByProject.mockResolvedValue(
        ok([createFakeIssueType()]),
      )

      const result = await IssueTypeService.list('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await IssueTypeService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a type when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedIssueType.create.mockResolvedValue(ok(createFakeIssueType()))

      const result = await IssueTypeService.create(
        'actor',
        'ws1',
        'proj-slug',
        {
          name: 'Bug',
          color: 'RED',
          icon: 'bug-icon',
        },
      )

      expectOk(result)
    })

    it('should return ISSUE_TYPE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await IssueTypeService.create(
        'actor',
        'ws1',
        'proj-slug',
        {
          name: 'Bug',
          color: 'RED',
          icon: 'bug-icon',
        },
      )

      expectErr(result, 'ISSUE_TYPE_FORBIDDEN')
      expect(mockedIssueType.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedIssueType.create.mockResolvedValue(err(databaseError()))

      const result = await IssueTypeService.create(
        'actor',
        'ws1',
        'proj-slug',
        {
          name: 'Bug',
          color: 'RED',
          icon: 'bug-icon',
        },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should return ISSUE_TYPE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await IssueTypeService.update(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
        {
          name: 'Renamed',
        },
      )

      expectErr(result, 'ISSUE_TYPE_FORBIDDEN')
      expect(mockedIssueType.findById).not.toHaveBeenCalled()
    })

    it('should return ISSUE_TYPE_NOT_FOUND when type belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'other-proj' })),
      )

      const result = await IssueTypeService.update(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
        {
          name: 'Renamed',
        },
      )

      expectErr(result, 'ISSUE_TYPE_NOT_FOUND')
    })

    it('should return ISSUE_TYPE_SYSTEM_PROTECTED when updating a system type (Task/Epic)', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'proj-1', isSystem: true })),
      )

      const result = await IssueTypeService.update(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'ISSUE_TYPE_SYSTEM_PROTECTED')
      expect(mockedIssueType.update).not.toHaveBeenCalled()
    })

    it('should propagate repo update error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'proj-1' })),
      )
      mockedIssueType.update.mockResolvedValue(err(databaseError()))

      const result = await IssueTypeService.update(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should delete a custom (non-system) type when actor is privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'proj-1', isSystem: false })),
      )
      mockedIssueType.delete.mockResolvedValue(ok(undefined))

      const result = await IssueTypeService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
      )

      expectOk(result)
    })

    it('should return ISSUE_TYPE_SYSTEM_PROTECTED for a system type (Task/Epic)', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'proj-1', isSystem: true })),
      )

      const result = await IssueTypeService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
      )

      expectErr(result, 'ISSUE_TYPE_SYSTEM_PROTECTED')
    })

    it('should return ISSUE_TYPE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await IssueTypeService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
      )

      expectErr(result, 'ISSUE_TYPE_FORBIDDEN')
    })

    it('should return ISSUE_TYPE_NOT_FOUND when type belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'other-proj' })),
      )

      const result = await IssueTypeService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
      )

      expectErr(result, 'ISSUE_TYPE_NOT_FOUND')
    })

    it('should propagate repo delete error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'proj-1', isSystem: false })),
      )
      mockedIssueType.delete.mockResolvedValue(err(databaseError()))

      const result = await IssueTypeService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'type-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('reorder()', () => {
    it('should reorder when actor is privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssueType.reorder.mockResolvedValue(
        ok([createFakeIssueType({ projectId: 'proj-1' })]),
      )

      const result = await IssueTypeService.reorder(
        'actor',
        'ws1',
        'proj-slug',
        { typeIds: ['a', 'b'] },
      )

      expectOk(result)
    })

    it('should return ISSUE_TYPE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await IssueTypeService.reorder(
        'actor',
        'ws1',
        'proj-slug',
        { typeIds: ['a', 'b'] },
      )

      expectErr(result, 'ISSUE_TYPE_FORBIDDEN')
      expect(mockedIssueType.reorder).not.toHaveBeenCalled()
    })
  })

  it('should propagate membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )

    const result = await IssueTypeService.list('actor', 'ws1', 'proj-slug')

    expectErr(result, 'DATABASE_ERROR')
  })
})
