import { describe, expect, it, vi } from 'vitest'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { createFakeState } from '@/src/__tests__/factories/state.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueTypeRepository } from '@/src/repositories/issue-type.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { StateRepository } from '@/src/repositories/state.repository'
import { IssueService } from '../issue.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-type.repository')
vi.mock('@/src/repositories/state.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedIssueType = vi.mocked(IssueTypeRepository)
const mockedState = vi.mocked(StateRepository)

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

const taskType = createFakeIssueType({
  id: 'type-task',
  name: 'Task',
  isSystem: true,
  projectId: 'proj-1',
})

describe('IssueService', () => {
  describe('list()', () => {
    it('should return issues as DTOs for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedIssue.listByProject.mockResolvedValue(ok([createFakeIssue()]))

      const result = await IssueService.list('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false }, [])),
      )

      const result = await IssueService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should default typeId to the system Task when omitted', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.listByProject.mockResolvedValue(ok([taskType]))
      mockedIssue.create.mockResolvedValue(
        ok(createFakeIssue({ typeId: 'type-task' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectOk(result)
      expect(mockedIssue.create).toHaveBeenCalledWith(
        expect.objectContaining({ typeId: 'type-task', authorId: 'actor' }),
      )
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'ISSUE_FORBIDDEN')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_STATE_INVALID when the state belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'other-proj' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'ISSUE_STATE_INVALID')
    })

    it('should return ISSUE_TYPE_INVALID when the typeId belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'other-proj' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: 'state-1',
        priority: 'NONE',
        typeId: 'type-2',
      })

      expectErr(result, 'ISSUE_TYPE_INVALID')
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.listByProject.mockResolvedValue(ok([taskType]))
      mockedIssue.create.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return VALIDATION_ERROR when dueDate is before startDate', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.listByProject.mockResolvedValue(ok([taskType]))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: 'state-1',
        priority: 'NONE',
        startDate: '2025-03-05T10:00:00.000Z',
        dueDate: '2025-03-01T10:00:00.000Z',
      })

      expectErr(result, 'VALIDATION_ERROR')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })
  })

  describe('update()', () => {
    it('should return ISSUE_NOT_FOUND whe issue belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { title: 'Renamed' },
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
    })

    it('should update when issue belongs to the resolved project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedIssue.update.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1', title: 'Renamed' })),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { title: 'Renamed' },
      )

      expect(expectOk(result).title).toBe('Renamed')
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { title: 'Renamed' },
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
      expect(mockedIssue.findById).not.toHaveBeenCalled()
    })

    it('should validate a new dueDate against the stored startDate', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(
          createFakeIssue({
            projectId: 'proj-1',
            startDate: new Date('2025-03-05T10:00:00.000Z'),
          }),
        ),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { dueDate: '2025-03-01T10:00:00.000Z' },
      )

      expectErr(result, 'VALIDATION_ERROR')
      expect(mockedIssue.update).not.toHaveBeenCalled()
    })
  })

  describe('delete()', () => {
    it('should delete when actor is a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedIssue.delete.mockResolvedValue(ok(undefined))

      const result = await IssueService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectOk(result)
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

      const result = await IssueService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
    })

    it('should propagate repo delete error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedIssue.delete.mockResolvedValue(err(databaseError()))

      const result = await IssueService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  it('should propagate membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )

    const result = await IssueService.list('actor', 'ws1', 'proj-slug')

    expectErr(result, 'DATABASE_ERROR')
  })
})
