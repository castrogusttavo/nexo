import { describe, expect, it, vi } from 'vitest'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeLabel } from '@/src/__tests__/factories/label.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueLabelRepository } from '@/src/repositories/issue-label.repository'
import { LabelRepository } from '@/src/repositories/label.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { IssueLabelService } from '../issue-label.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-label.repository')
vi.mock('@/src/repositories/label.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedIssueLabel = vi.mocked(IssueLabelRepository)
const mockedLabel = vi.mocked(LabelRepository)

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

const fakeIssueLabel = {
  id: 'il-1',
  issueId: 'issue-1',
  labelId: 'label-1',
  createdAt: new Date(),
  label: createFakeLabel({ id: 'label-1', projectId: 'proj-1' }),
}

describe('IssueLabelService', () => {
  describe('add()', () => {
    it('should attach a label from the same project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedLabel.findById.mockResolvedValue(
        ok(createFakeLabel({ projectId: 'proj-1' })),
      )
      mockedIssueLabel.add.mockResolvedValue(ok(fakeIssueLabel))

      const result = await IssueLabelService.add(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'label-1',
      )

      expectOk(result)
    })

    it('should return LABEL_NOT_FOUND when the label belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedLabel.findById.mockResolvedValue(
        ok(createFakeLabel({ projectId: 'other-proj' })),
      )

      const result = await IssueLabelService.add(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'label-1',
      )

      expectErr(result, 'LABEL_NOT_FOUND')
      expect(mockedIssueLabel.add).not.toHaveBeenCalled()
    })

    it('should return ISSUE_NOT_FOUND when the issue belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await IssueLabelService.add(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'label-1',
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

      const result = await IssueLabelService.add(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'label-1',
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('remove()', () => {
    it('should detach the label', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedIssueLabel.remove.mockResolvedValue(ok(undefined))

      const result = await IssueLabelService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'label-1',
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
      mockedIssueLabel.remove.mockResolvedValue(err(databaseError()))

      const result = await IssueLabelService.remove(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'label-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('list()', () => {
    it('should return attached labels as DTOs', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedIssueLabel.list.mockResolvedValue(ok([fakeIssueLabel]))

      const result = await IssueLabelService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })
  })
})
