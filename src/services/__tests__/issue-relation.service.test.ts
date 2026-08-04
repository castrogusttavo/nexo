import { describe, expect, it, vi } from 'vitest'
import {
  createFakeIssue,
  createFakeIssueRelation,
} from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueRelationRepository } from '@/src/repositories/issue-relation.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueRelationService } from '../issue-relation.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-relation.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedRelation = vi.mocked(IssueRelationRepository)

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

describe('IssueRelationService', () => {
  describe('create()', () => {
    it('should create a relation between issues of the same project', async () => {
      inProject()
      mockedRelation.findBetween.mockResolvedValue(ok(null))
      mockedRelation.create.mockResolvedValue(
        ok(createFakeIssueRelation({ sourceId: 'issue-1' })),
      )

      const result = await IssueRelationService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'RELATES_TO' },
      )

      expectOk(result)
    })

    it('should return ISSUE_RELATION_SELF when target is the issue itself', async () => {
      inProject()

      const result = await IssueRelationService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-1', type: 'RELATES_TO' },
      )

      expectErr(result, 'ISSUE_RELATION_SELF')
      expect(mockedRelation.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_RELATION_ALREADY_EXISTS when the pair is already linked in reverse', async () => {
      inProject()
      mockedRelation.findBetween.mockResolvedValue(
        ok(
          createFakeIssueRelation({
            sourceId: 'issue-2',
            targetId: 'issue-1',
          }),
        ),
      )

      const result = await IssueRelationService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'RELATES_TO' },
      )

      expectErr(result, 'ISSUE_RELATION_ALREADY_EXISTS')
      expect(mockedRelation.create).not.toHaveBeenCalled()
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

      const result = await IssueRelationService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'RELATES_TO' },
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedRelation.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueRelationService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { targetId: 'issue-2', type: 'RELATES_TO' },
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('remove()', () => {
    it('should remove a relation where the issue is the source', async () => {
      inProject()
      mockedRelation.findById.mockResolvedValue(
        ok(createFakeIssueRelation({ sourceId: 'issue-1' })),
      )
      mockedRelation.remove.mockResolvedValue(ok(undefined))

      const result = await IssueRelationService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'rel-1',
      )

      expectOk(result)
    })

    it('should remove a relation where the issue is the target', async () => {
      inProject()
      mockedRelation.findById.mockResolvedValue(
        ok(createFakeIssueRelation({ targetId: 'issue-1' })),
      )
      mockedRelation.remove.mockResolvedValue(ok(undefined))

      const result = await IssueRelationService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'rel-1',
      )

      expectOk(result)
    })

    it('should return ISSUE_NOT_FOUND when the relation does not touch the issue', async () => {
      inProject()
      mockedRelation.findById.mockResolvedValue(
        ok(
          createFakeIssueRelation({
            sourceId: 'other-1',
            targetId: 'other-2',
          }),
        ),
      )

      const result = await IssueRelationService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'rel-1',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedRelation.remove).not.toHaveBeenCalled()
    })
  })

  describe('list()', () => {
    it('should return relations as DTOs', async () => {
      inProject()
      mockedRelation.listByIssue.mockResolvedValue(
        ok([createFakeIssueRelation()]),
      )

      const result = await IssueRelationService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should propagate repo error', async () => {
      inProject()
      mockedRelation.listByIssue.mockResolvedValue(err(databaseError()))

      const result = await IssueRelationService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
