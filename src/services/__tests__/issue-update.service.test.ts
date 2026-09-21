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
import {
  describeProjectAccessGate,
  GATE_PROJECT_ID,
} from './_project-access-gate'

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

    // Moderation is a second gate after the project one. The lead passes it
    // on their own: not the author, not privileged, not on the member list.
    it('should let the project lead moderate someone else update', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' }, [{ userId: 'other' }])),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
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
      expect(mockedIssueUpdate.delete).toHaveBeenCalledWith('update-1')
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

// update()/delete() also check authorship; the actor authors the update here
// so the project gate is the only thing that can say no.
describeProjectAccessGate('IssueUpdateService', [
  {
    name: 'list()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeOwnUpdate,
    call: (actorId) =>
      IssueUpdateService.list(actorId, 'ws1', 'proj-slug', 'issue-1'),
    sideEffects: () => [mockedIssueUpdate.listByIssue],
  },
  {
    name: 'create()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeOwnUpdate,
    call: (actorId) =>
      IssueUpdateService.create(actorId, 'ws1', 'proj-slug', 'issue-1', {
        status: 'ON_TRACK',
        content: 'Tudo certo',
      }),
    sideEffects: () => [mockedIssueUpdate.create],
  },
  {
    name: 'update()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeOwnUpdate,
    call: (actorId) =>
      IssueUpdateService.update(
        actorId,
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
        { status: 'AT_RISK' },
      ),
    sideEffects: () => [mockedIssueUpdate.update],
  },
  {
    name: 'delete()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeOwnUpdate,
    call: (actorId) =>
      IssueUpdateService.delete(
        actorId,
        'ws1',
        'proj-slug',
        'issue-1',
        'update-1',
      ),
    sideEffects: () => [mockedIssueUpdate.delete],
  },
])

function arrangeOwnUpdate() {
  mockedIssue.findById.mockResolvedValue(
    ok(createFakeIssue({ projectId: GATE_PROJECT_ID })),
  )
  mockedIssueUpdate.listByIssue.mockResolvedValue(ok([withAuthor()]))
  mockedIssueUpdate.create.mockResolvedValue(ok(withAuthor()))
  mockedIssueUpdate.findById.mockResolvedValue(
    ok(createFakeIssueUpdate({ issueId: 'issue-1', authorId: 'actor' })),
  )
  mockedIssueUpdate.update.mockResolvedValue(ok(withAuthor()))
  mockedIssueUpdate.delete.mockResolvedValue(ok(undefined))
}
