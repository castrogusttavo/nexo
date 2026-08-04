import { describe, expect, it, vi } from 'vitest'
import {
  createFakeIssue,
  createFakeIssueVote,
} from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, issueVoteNotFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueVoteRepository } from '@/src/repositories/issue-vote.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueVoteService } from '../issue-vote.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-vote.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedVote = vi.mocked(IssueVoteRepository)

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

describe('IssueVoteService', () => {
  describe('cast()', () => {
    it('should upsert the vote and return the updated summary', async () => {
      inProject()
      mockedVote.upsert.mockResolvedValue(
        ok(createFakeIssueVote({ userId: 'actor', type: 'UP' })),
      )
      mockedVote.tallyByIssue.mockResolvedValue(ok({ up: 1, down: 0 }))
      mockedVote.findByIssueAndUser.mockResolvedValue(
        ok(createFakeIssueVote({ userId: 'actor', type: 'UP' })),
      )

      const result = await IssueVoteService.cast(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { type: 'UP' },
      )

      expect(expectOk(result)).toEqual({ up: 1, down: 0, myVote: 'UP' })
    })

    it('should return ISSUE_NOT_FOUND when the issue is in another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await IssueVoteService.cast(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { type: 'UP' },
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedVote.upsert).not.toHaveBeenCalled()
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'proj-1' }, [])),
      )

      const result = await IssueVoteService.cast(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { type: 'UP' },
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('retract()', () => {
    it('should remove the vote and return the updated summary', async () => {
      inProject()
      mockedVote.delete.mockResolvedValue(ok(undefined))
      mockedVote.tallyByIssue.mockResolvedValue(ok({ up: 0, down: 0 }))
      mockedVote.findByIssueAndUser.mockResolvedValue(ok(null))

      const result = await IssueVoteService.retract(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toEqual({ up: 0, down: 0, myVote: null })
    })

    it('should return ISSUE_VOTE_NOT_FOUND when there is no vote', async () => {
      inProject()
      mockedVote.delete.mockResolvedValue(err(issueVoteNotFound()))

      const result = await IssueVoteService.retract(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'ISSUE_VOTE_NOT_FOUND')
    })
  })

  describe('summary()', () => {
    it('should return null myVote when the actor has not voted', async () => {
      inProject()
      mockedVote.tallyByIssue.mockResolvedValue(ok({ up: 2, down: 1 }))
      mockedVote.findByIssueAndUser.mockResolvedValue(ok(null))

      const result = await IssueVoteService.summary(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toEqual({ up: 2, down: 1, myVote: null })
    })

    it('should propagate repo error', async () => {
      inProject()
      mockedVote.tallyByIssue.mockResolvedValue(err(databaseError()))

      const result = await IssueVoteService.summary(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
