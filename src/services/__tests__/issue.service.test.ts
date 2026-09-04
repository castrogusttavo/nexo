import { describe, expect, it, vi } from 'vitest'
import { createFakeCycle } from '@/src/__tests__/factories/cycle.factory'
import {
  createFakeEstimateSettings,
  createFakeEstimateValue,
} from '@/src/__tests__/factories/estimate.factory'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeModule } from '@/src/__tests__/factories/module.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { createFakeState } from '@/src/__tests__/factories/state.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { IssueListCache } from '@/src/cache/issue-list.cache'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { CycleRepository } from '@/src/repositories/cycle.repository'
import { EstimateRepository } from '@/src/repositories/estimate.repository'
import { EstimateValueRepository } from '@/src/repositories/estimate-value.repository'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { IssueTypeRepository } from '@/src/repositories/issue-type.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ModuleRepository } from '@/src/repositories/module.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { StateRepository } from '@/src/repositories/state.repository'
import type { IssueDTO } from '@/types/issue'
import { ActivityService } from '../activity.service'
import { IssueService } from '../issue.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/issue-type.repository')
vi.mock('@/src/repositories/state.repository')
vi.mock('@/src/repositories/cycle.repository')
vi.mock('@/src/repositories/module.repository')
vi.mock('@/src/repositories/estimate.repository')
vi.mock('@/src/repositories/estimate-value.repository')
vi.mock('../activity.service')
// create/update/delete call IssueListCache.invalidate() — without this,
// a unit test (no Redis available) hangs on a real connection attempt.
vi.mock('@/src/cache/issue-list.cache')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedIssueType = vi.mocked(IssueTypeRepository)
const mockedState = vi.mocked(StateRepository)
const mockedCycle = vi.mocked(CycleRepository)
const mockedModule = vi.mocked(ModuleRepository)
const mockedEstimate = vi.mocked(EstimateRepository)
const mockedEstimateValue = vi.mocked(EstimateValueRepository)
const mockedActivityService = vi.mocked(ActivityService)
const mockedIssueListCache = vi.mocked(IssueListCache)

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
      mockedIssue.listByProject.mockResolvedValue(
        ok([
          {
            ...createFakeIssue(),
            labels: [{ labelId: 'label-1' }],
            assignees: [{ userId: 'user-1' }],
          },
        ]),
      )

      const result = await IssueService.list('actor', 'ws1', 'proj-slug')

      const issues = expectOk(result) as IssueDTO[]
      expect(issues).toHaveLength(1)
      expect(issues[0].labelIds).toEqual(['label-1'])
      expect(issues[0].assigneeIds).toEqual(['user-1'])
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

    it('should propagate the repository error when unpaginated listing fails', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedIssue.listByProject.mockResolvedValue(err(databaseError()))

      const result = await IssueService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return a cached page without hitting the repository', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedIssueListCache.get.mockResolvedValue({
        version: '1',
        page: { items: [], nextCursor: null },
      })

      const result = await IssueService.list('actor', 'ws1', 'proj-slug', {
        limit: 20,
      })

      expect(expectOk(result)).toEqual({ items: [], nextCursor: null })
      expect(mockedIssue.listByProjectPage).not.toHaveBeenCalled()
    })

    it('should fetch, cache and set nextCursor when there is another page', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedIssueListCache.get.mockResolvedValue({ version: '1', page: null })
      mockedIssue.listByProjectPage.mockResolvedValue(
        ok({
          items: [
            {
              ...createFakeIssue({ number: 5 }),
              labels: [{ labelId: 'label-1' }],
              assignees: [{ userId: 'user-1' }],
            },
          ],
          hasNextPage: true,
        }),
      )

      const result = await IssueService.list('actor', 'ws1', 'proj-slug', {
        limit: 20,
      })

      const page = expectOk(result) as {
        items: IssueDTO[]
        nextCursor: number | null
      }
      expect(page.nextCursor).toBe(5)
      expect(page.items[0].labelIds).toEqual(['label-1'])
      expect(page.items[0].assigneeIds).toEqual(['user-1'])
      expect(mockedIssueListCache.set).toHaveBeenCalledWith(
        'proj-1',
        '1',
        { cursor: undefined, limit: 20 },
        page,
      )
    })

    it('should set nextCursor to null when there is no further page', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedIssueListCache.get.mockResolvedValue({ version: '1', page: null })
      mockedIssue.listByProjectPage.mockResolvedValue(
        ok({ items: [], hasNextPage: false }),
      )

      const result = await IssueService.list('actor', 'ws1', 'proj-slug', {
        limit: 20,
      })

      expect(
        (expectOk(result) as { nextCursor: number | null }).nextCursor,
      ).toBeNull()
    })

    it('should propagate the repository error when paginated listing fails', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedIssueListCache.get.mockResolvedValue({ version: '1', page: null })
      mockedIssue.listByProjectPage.mockResolvedValue(err(databaseError()))

      const result = await IssueService.list('actor', 'ws1', 'proj-slug', {
        limit: 20,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('getById()', () => {
    it('should return the issue DTO for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' })),
      )

      const result = await IssueService.getById(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result).id).toBe('issue-1')
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false }, [])),
      )

      const result = await IssueService.getById(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedIssue.findById).not.toHaveBeenCalled()
    })

    it('should propagate the repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.getById(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate resolveProject errors', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await IssueService.getById(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
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

      const result = await IssueService.getById(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
    })
  })

  describe('getByIdentifier()', () => {
    it('should return the issue DTO for a valid identifier', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findByProjectAndNumber.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', number: 42, projectId: 'proj-1' })),
      )

      const result = await IssueService.getByIdentifier(
        'actor',
        'ws1',
        'proj-slug',
        'ENG-42',
      )

      expect(expectOk(result).id).toBe('issue-1')
      expect(mockedIssue.findByProjectAndNumber).toHaveBeenCalledWith(
        'proj-1',
        42,
      )
    })

    it('should return ISSUE_NOT_FOUND for a malformed identifier', async () => {
      const result = await IssueService.getByIdentifier(
        'actor',
        'ws1',
        'proj-slug',
        'not-an-identifier',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedProject.findByWorkspaceAndSlug).not.toHaveBeenCalled()
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false }, [])),
      )

      const result = await IssueService.getByIdentifier(
        'actor',
        'ws1',
        'proj-slug',
        'ENG-42',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should propagate the repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findByProjectAndNumber.mockResolvedValue(err(databaseError()))

      const result = await IssueService.getByIdentifier(
        'actor',
        'ws1',
        'proj-slug',
        'ENG-42',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate resolveProject errors', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await IssueService.getByIdentifier(
        'actor',
        'ws1',
        'proj-slug',
        'ENG-42',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listChildren()', () => {
    it('should return the child issues as DTOs', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' })),
      )
      mockedIssue.listChildren.mockResolvedValue(
        ok([createFakeIssue({ parentId: 'issue-1', projectId: 'proj-1' })]),
      )

      const result = await IssueService.listChildren(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false }, [])),
      )

      const result = await IssueService.listChildren(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should return ISSUE_NOT_FOUND when the parent belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await IssueService.listChildren(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedIssue.listChildren).not.toHaveBeenCalled()
    })

    it('should propagate the repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' })),
      )
      mockedIssue.listChildren.mockResolvedValue(err(databaseError()))

      const result = await IssueService.listChildren(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the findById repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.listChildren(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedIssue.listChildren).not.toHaveBeenCalled()
    })

    it('should propagate resolveProject errors', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await IssueService.listChildren(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('count()', () => {
    it('should return the issue count for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.countByProject.mockResolvedValue(ok(7))

      const result = await IssueService.count('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toBe(7)
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false }, [])),
      )

      const result = await IssueService.count('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should propagate the repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.countByProject.mockResolvedValue(err(databaseError()))

      const result = await IssueService.count('actor', 'ws1', 'proj-slug')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate resolveProject errors', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await IssueService.count('actor', 'ws1', 'proj-slug')

      expectErr(result, 'DATABASE_ERROR')
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
        description: [],
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
        description: [],
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
        description: [],
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
        description: [],
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
        description: [],
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
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        startDate: '2025-03-05T10:00:00.000Z',
        dueDate: '2025-03-01T10:00:00.000Z',
      })

      expectErr(result, 'VALIDATION_ERROR')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should return CYCLE_NOT_FOUND when the cycle belongs to another project', async () => {
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
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ projectId: 'other-proj' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        cycleId: 'cycle-1',
      })

      expectErr(result, 'CYCLE_NOT_FOUND')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should return ESTIMATE_VALUE_NOT_FOUND when the value belongs to another project', async () => {
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
      mockedEstimateValue.findById.mockResolvedValue(
        ok(createFakeEstimateValue({ estimateSettingsId: 'other-settings' })),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'settings-1' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        estimateValueId: 'value-1',
      })

      expectErr(result, 'ESTIMATE_VALUE_NOT_FOUND')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should return MODULE_NOT_FOUND when the module belongs to another project', async () => {
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
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        moduleId: 'module-1',
      })

      expectErr(result, 'MODULE_NOT_FOUND')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_TYPE_INVALID when there is no default Task type', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.listByProject.mockResolvedValue(ok([]))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'ISSUE_TYPE_INVALID')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_NOT_FOUND when the parent belongs to another project', async () => {
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
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ id: 'parent-1', projectId: 'other-proj' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        parentId: 'parent-1',
      })

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedIssue.create).not.toHaveBeenCalled()
    })

    it('should create the issue when the parent belongs to the same project', async () => {
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
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ id: 'parent-1', projectId: 'proj-1' })),
      )
      mockedIssue.create.mockResolvedValue(
        ok(createFakeIssue({ parentId: 'parent-1' })),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        parentId: 'parent-1',
      })

      expectOk(result)
    })

    it('should propagate resolveProject errors', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the state repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the type repository error when typeId is provided', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        typeId: 'type-2',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the issue-type repository error when resolving the default type', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedIssueType.listByProject.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the cycle repository error', async () => {
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
      mockedCycle.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        cycleId: 'cycle-1',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the module repository error', async () => {
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
      mockedModule.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        moduleId: 'module-1',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the estimate value repository error', async () => {
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
      mockedEstimateValue.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        estimateValueId: 'value-1',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the estimate settings repository error', async () => {
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
      mockedEstimateValue.findById.mockResolvedValue(
        ok(createFakeEstimateValue({ estimateSettingsId: 'settings-1' })),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        estimateValueId: 'value-1',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the parent lookup repository error', async () => {
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
      mockedIssue.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.create('actor', 'ws1', 'proj-slug', {
        title: 'Bug',
        description: [],
        stateId: 'state-1',
        priority: 'NONE',
        parentId: 'parent-1',
      })

      expectErr(result, 'DATABASE_ERROR')
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

    it('should propagate the findById repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { title: 'Renamed' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should update the parent when it is not an ancestor of the issue', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockImplementation(async (id: string) => {
        if (id === 'issue-1') {
          return ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' }))
        }
        // 'parent-1' has no parent of its own — the ancestor walk completes
        // without ever matching 'issue-1'.
        return ok(
          createFakeIssue({
            id: 'parent-1',
            projectId: 'proj-1',
            parentId: null,
          }),
        )
      })
      mockedIssue.update.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', parentId: 'parent-1' })),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { parentId: 'parent-1' },
      )

      expectOk(result)
      expect(mockedIssue.update).toHaveBeenCalled()
    })

    it('should propagate a repository error found while walking the ancestor chain', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockImplementation(async (id: string) => {
        if (id === 'issue-1') {
          return ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' }))
        }
        if (id === 'parent-1') {
          return ok(
            createFakeIssue({
              id: 'parent-1',
              projectId: 'proj-1',
              parentId: 'grandparent-1',
            }),
          )
        }
        return err(databaseError())
      })

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { parentId: 'parent-1' },
      )

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedIssue.update).not.toHaveBeenCalled()
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

    it('should return ISSUE_PARENT_CYCLE when the parent is the issue itself', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' })),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { parentId: 'issue-1' },
      )

      expectErr(result, 'ISSUE_PARENT_CYCLE')
      expect(mockedIssue.update).not.toHaveBeenCalled()
    })

    it('should return ISSUE_PARENT_CYCLE when the parent is a descendant', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockImplementation(async (id: string) => {
        if (id === 'issue-1') {
          return ok(createFakeIssue({ id: 'issue-1', projectId: 'proj-1' }))
        }
        return ok(
          createFakeIssue({
            id: 'issue-2',
            projectId: 'proj-1',
            parentId: 'issue-1',
          }),
        )
      })

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { parentId: 'issue-2' },
      )

      expectErr(result, 'ISSUE_PARENT_CYCLE')
      expect(mockedIssue.update).not.toHaveBeenCalled()
    })

    it('should return ISSUE_STATE_INVALID when the new state belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'other-proj' })),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { stateId: 'state-2' },
      )

      expectErr(result, 'ISSUE_STATE_INVALID')
      expect(mockedIssue.update).not.toHaveBeenCalled()
    })

    it('should return ISSUE_TYPE_INVALID when the new type belongs to another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedIssueType.findById.mockResolvedValue(
        ok(createFakeIssueType({ projectId: 'other-proj' })),
      )

      const result = await IssueService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { typeId: 'type-2' },
      )

      expectErr(result, 'ISSUE_TYPE_INVALID')
      expect(mockedIssue.update).not.toHaveBeenCalled()
    })

    it('should record a priority change as an activity', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(
          createFakeIssue({
            id: 'issue-1',
            projectId: 'proj-1',
            priority: 'NONE',
          }),
        ),
      )
      mockedIssue.update.mockResolvedValue(
        ok(createFakeIssue({ id: 'issue-1', priority: 'HIGH' })),
      )

      await IssueService.update('actor', 'ws1', 'proj-slug', 'issue-1', {
        priority: 'HIGH',
      })

      expect(mockedActivityService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'ISSUE',
          entityId: 'issue-1',
          field: 'priority',
          oldValue: 'NONE',
          newValue: 'HIGH',
        }),
      )
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

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await IssueService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
      expect(mockedIssue.findById).not.toHaveBeenCalled()
    })

    it('should propagate resolveProject errors', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await IssueService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate the findById repository error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedIssue.findById.mockResolvedValue(err(databaseError()))

      const result = await IssueService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
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
