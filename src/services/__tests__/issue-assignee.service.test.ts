import { describe, expect, it, vi } from 'vitest'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, issueSubscriberNotFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import {
  IssueAssigneeRepository,
  IssueSubscriberRepository,
} from '@/src/repositories/issue-assignee.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueAssigneeService } from '../issue-assignee.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-assignee.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedAssignee = vi.mocked(IssueAssigneeRepository)
const mockedSubscriber = vi.mocked(IssueSubscriberRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
  members: { userId: string }[] = [{ userId: 'actor' }, { userId: 'target' }],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

const fakeAssigneeWithUser = {
  id: 'ia-1',
  issueId: 'issue-1',
  userId: 'target',
  createdAt: new Date(),
  user: { id: 'target', name: 'Target', username: 'target', image: null },
}

describe('IssueAssigneeService', () => {
  describe('assign()', () => {
    it('should assign and auto-subscribe the target member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedAssignee.assign.mockResolvedValue(ok(fakeAssigneeWithUser))
      mockedSubscriber.subscribe.mockResolvedValue(
        ok({
          id: 'sub-1',
          issueId: 'issue-1',
          userId: 'target',
          createdAt: new Date(),
        }),
      )

      const result = await IssueAssigneeService.assign(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'target',
      )

      expectOk(result)
      expect(mockedSubscriber.subscribe).toHaveBeenCalledWith(
        'issue-1',
        'target',
      )
    })

    it('should return PROJECT_MEMBER_NOT_FOUND when target is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' }, [{ userId: 'actor' }])),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )

      const result = await IssueAssigneeService.assign(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'outsider',
      )

      expectErr(result, 'PROJECT_MEMBER_NOT_FOUND')
      expect(mockedAssignee.assign).not.toHaveBeenCalled()
    })

    it('should return ISSUE_NOT_FOUND when issue belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await IssueAssigneeService.assign(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'target',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueAssigneeService.assign(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'target',
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('unassign()', () => {
    it('should remove the assignee', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedAssignee.unassign.mockResolvedValue(ok(undefined))

      const result = await IssueAssigneeService.unassign(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'target',
      )

      expectOk(result)
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedAssignee.unassign.mockResolvedValue(err(databaseError()))

      const result = await IssueAssigneeService.unassign(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'target',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('subscribe()', () => {
    it('should subscribe the actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedSubscriber.subscribe.mockResolvedValue(
        ok({
          id: 'sub-1',
          issueId: 'issue-1',
          userId: 'target',
          createdAt: new Date(),
        }),
      )

      const result = await IssueAssigneeService.subscribe(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectOk(result)
      expect(mockedSubscriber.subscribe).toHaveBeenCalledWith(
        'issue-1',
        'actor',
      )
    })
  })

  describe('unsubscribe()', () => {
    it('should unsubscribe the actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedSubscriber.unsubscribe.mockResolvedValue(ok(undefined))

      const result = await IssueAssigneeService.unsubscribe(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectOk(result)
    })

    it('should return ISSUE_SUBSCRIBER_NOT_FOUND when not subscribed', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedSubscriber.unsubscribe.mockResolvedValue(
        err(issueSubscriberNotFound()),
      )

      const result = await IssueAssigneeService.unsubscribe(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'ISSUE_SUBSCRIBER_NOT_FOUND')
    })
  })
})
