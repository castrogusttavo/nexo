import { describe, expect, it, vi } from 'vitest'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeIssueUpdate } from '@/src/__tests__/factories/issue-update.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueUpdateRepository } from '@/src/repositories/issue-update.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueUpdateService } from '../issue-update.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-update.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedIssueUpdate = vi.mocked(IssueUpdateRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})
const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
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

function withAuthor(
  overrides?: Partial<ReturnType<typeof createFakeIssueUpdate>>,
) {
  return {
    ...createFakeIssueUpdate({ issueId: 'issue-1', ...overrides }),
    author: { id: 'actor', name: 'Ana', username: 'ana', image: null },
  }
}

function inProject(membership = memberMembership) {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(membership))
  mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
    ok(projectWith({ id: 'proj-1' })),
  )
  mockedIssue.findById.mockResolvedValue(
    ok(createFakeIssue({ projectId: 'proj-1' })),
  )
}

describe('IssueUpdateService', () => {
  describe('create()', () => {
    it('should create an update', async () => {
      inProject()
      mockedIssueUpdate.create.mockResolvedValue(
        ok(withAuthor({ authorId: 'actor' })),
      )

      const result = await IssueUpdateService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { status: 'ON_TRACK' },
      )

      expectOk(result)
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueUpdateService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { status: 'ON_TRACK' },
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('update()', () => {
    it('should update the actor own update', async () => {
      inProject()
      mockedIssueUpdate.findById.mockResolvedValue(
        ok(withAuthor({ issueId: 'issue-1', authorId: 'actor' })),
      )
      mockedIssueUpdate.update.mockResolvedValue(ok(withAuthor()))

      const result = await IssueUpdateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
        { status: 'AT_RISK' },
      )

      expectOk(result)
    })

    it('should return ISSUE_UPDATE_FORBIDDEN when editing someone else update', async () => {
      inProject()
      mockedIssueUpdate.findById.mockResolvedValue(
        ok(withAuthor({ issueId: 'issue-1', authorId: 'other' })),
      )

      const result = await IssueUpdateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
        { status: 'AT_RISK' },
      )

      expectErr(result, 'ISSUE_UPDATE_FORBIDDEN')
      expect(mockedIssueUpdate.update).not.toHaveBeenCalled()
    })

    it('should return ISSUE_UPDATE_NOT_FOUND when it belongs to another issue', async () => {
      inProject()
      mockedIssueUpdate.findById.mockResolvedValue(
        ok(
          createFakeIssueUpdate({
            issueId: 'other-issue',
            authorId: 'actor',
          }),
        ),
      )

      const result = await IssueUpdateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
        { status: 'AT_RISK' },
      )

      expectErr(result, 'ISSUE_UPDATE_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should delete the actor own update', async () => {
      inProject()
      mockedIssueUpdate.findById.mockResolvedValue(
        ok(withAuthor({ issueId: 'issue-1', authorId: 'actor' })),
      )
      mockedIssueUpdate.delete.mockResolvedValue(ok(undefined))

      const result = await IssueUpdateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
      )

      expectOk(result)
    })

    it('should let a privileged actor moderate someone else update', async () => {
      inProject(ownerMembership)
      mockedIssueUpdate.findById.mockResolvedValue(
        ok(withAuthor({ issueId: 'issue-1', authorId: 'other' })),
      )
      mockedIssueUpdate.delete.mockResolvedValue(ok(undefined))

      const result = await IssueUpdateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
      )

      expectOk(result)
    })

    it('should return ISSUE_UPDATE_FORBIDDEN for a plain member deleting someone else update', async () => {
      inProject()
      mockedIssueUpdate.findById.mockResolvedValue(
        ok(withAuthor({ issueId: 'issue-1', authorId: 'other' })),
      )

      const result = await IssueUpdateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
      )

      expectErr(result, 'ISSUE_UPDATE_FORBIDDEN')
      expect(mockedIssueUpdate.delete).not.toHaveBeenCalled()
    })
  })

  describe('list()', () => {
    it('should return updates as DTOs', async () => {
      inProject()
      mockedIssueUpdate.listByIssue.mockResolvedValue(ok([withAuthor()]))

      const result = await IssueUpdateService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should propagate repo error', async () => {
      inProject()
      mockedIssueUpdate.listByIssue.mockResolvedValue(err(databaseError()))

      const result = await IssueUpdateService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
