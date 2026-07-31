import { describe, expect, it, vi } from 'vitest'
import {
  createFakeIssue,
  createFakeIssueDependency,
} from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueDependencyRepository } from '@/src/repositories/issue-dependency.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueDependencyService } from '../issue-dependency.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-dependency.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedDependency = vi.mocked(IssueDependencyRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
  members: { userId: string }[] = [{ userId: 'actor' }],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

function inProject() {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(
    ok(memberMembership),
  )
  mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
    ok(projectWith({ id: 'proj-1' })),
  )
  mockedIssue.findById.mockResolvedValue(
    ok(createFakeIssue({ projectId: 'proj-1' })),
  )
}

describe('IssueDependencyService', () => {
  describe('create()', () => {
    it('should create a dependency between issues of the same project', async () => {
      inProject()
      mockedDependency.listOutgoing.mockResolvedValue(ok([]))
      mockedDependency.create.mockResolvedValue(
        ok(createFakeIssueDependency({ sourceId: 'issue-1' })),
      )

      const result = await IssueDependencyService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'BLOCKS' },
      )

      expectOk(result)
    })

    it('should return ISSUE_DEPENDENCY_CYCLE for a self dependency', async () => {
      inProject()
      mockedDependency.listOutgoing.mockResolvedValue(ok([]))

      const result = await IssueDependencyService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-1', type: 'BLOCKS' },
      )

      expectErr(result, 'ISSUE_DEPENDENCY_CYCLE')
      expect(mockedDependency.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_DEPENDENCY_CYCLE when the target already reaches the source', async () => {
      inProject()
      mockedDependency.listOutgoing.mockImplementation(async (id: string) => {
        if (id === 'issue-2') {
          return ok([createFakeIssueDependency({ targetId: 'issue-3' })])
        }
        if (id === 'issue-3') {
          return ok([createFakeIssueDependency({ targetId: 'issue-1' })])
        }
        return ok([])
      })

      const result = await IssueDependencyService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'BLOCKS' },
      )

      expectErr(result, 'ISSUE_DEPENDENCY_CYCLE')
      expect(mockedDependency.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_NOT_FOUND when the target is in another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockImplementation(async (id: string) => {
        if (id === 'issue-1') {
          return ok(createFakeIssue({ projectId: 'proj-1' }))
        }
        return ok(createFakeIssue({ projectId: 'other-proj' }))
      })

      const result = await IssueDependencyService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'BLOCKS' },
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedDependency.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueDependencyService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'BLOCKS' },
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('remove()', () => {
    it('should remove a dependency where the issue is the source', async () => {
      inProject()
      mockedDependency.findById.mockResolvedValue(
        ok(createFakeIssueDependency({ sourceId: 'issue-1' })),
      )
      mockedDependency.remove.mockResolvedValue(ok(undefined))

      const result = await IssueDependencyService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'dep-1',
      )

      expectOk(result)
    })

    it('should remove a dependency where the issue is the target', async () => {
      inProject()
      mockedDependency.findById.mockResolvedValue(
        ok(createFakeIssueDependency({ targetId: 'issue-1' })),
      )
      mockedDependency.remove.mockResolvedValue(ok(undefined))

      const result = await IssueDependencyService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'dep-1',
      )

      expectOk(result)
    })

    it('should return ISSUE_NOT_FOUND when the dependency does not touch the issue', async () => {
      inProject()
      mockedDependency.findById.mockResolvedValue(
        ok(
          createFakeIssueDependency({
            sourceId: 'other-1',
            targetId: 'other-2',
          }),
        ),
      )

      const result = await IssueDependencyService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'dep-1',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedDependency.remove).not.toHaveBeenCalled()
    })
  })

  describe('list()', () => {
    it('should return dependencies as DTOs', async () => {
      inProject()
      mockedDependency.listByIssue.mockResolvedValue(
        ok([createFakeIssueDependency()]),
      )

      const result = await IssueDependencyService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should propagate repo error', async () => {
      inProject()
      mockedDependency.listByIssue.mockResolvedValue(err(databaseError()))

      const result = await IssueDependencyService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
