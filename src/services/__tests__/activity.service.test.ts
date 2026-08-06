import { describe, expect, it, vi } from 'vitest'
import { createFakeActivity } from '@/src/__tests__/factories/activity.factory'
import { createFakeCycle } from '@/src/__tests__/factories/cycle.factory'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeModule } from '@/src/__tests__/factories/module.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { ActivityRepository } from '@/src/repositories/activity.repository'
import { CycleRepository } from '@/src/repositories/cycle.repository'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ModuleRepository } from '@/src/repositories/module.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ActivityService } from '../activity.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/cycle.repository')
vi.mock('@/src/repositories/module.repository')
vi.mock('@/src/repositories/activity.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedCycle = vi.mocked(CycleRepository)
const mockedModule = vi.mocked(ModuleRepository)
const mockedActivity = vi.mocked(ActivityRepository)

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
}

describe('ActivityService', () => {
  describe('list()', () => {
    it('should list activity for an issue in the project', async () => {
      inProject()
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedActivity.listByEntity.mockResolvedValue(
        ok([
          {
            ...createFakeActivity(),
            actor: { id: 'actor', name: 'Ana', username: 'ana', image: null },
          },
        ]),
      )

      const result = await ActivityService.list(
        'actor',
        'ws1',
        'proj-slug',
        'ISSUE',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should list activity for a cycle in the project', async () => {
      inProject()
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ projectId: 'proj-1' })),
      )
      mockedActivity.listByEntity.mockResolvedValue(ok([]))

      const result = await ActivityService.list(
        'actor',
        'ws1',
        'proj-slug',
        'CYCLE',
        'cycle-1',
      )

      expectOk(result)
      expect(mockedIssue.findById).not.toHaveBeenCalled()
    })

    it('should list activity for a module in the project', async () => {
      inProject()
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedActivity.listByEntity.mockResolvedValue(ok([]))

      const result = await ActivityService.list(
        'actor',
        'ws1',
        'proj-slug',
        'MODULE',
        'module-1',
      )

      expectOk(result)
    })

    it('should return ISSUE_NOT_FOUND when the issue is in another project', async () => {
      inProject()
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'other-proj' })),
      )

      const result = await ActivityService.list(
        'actor',
        'ws1',
        'proj-slug',
        'ISSUE',
        'issue-1',
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
      expect(mockedActivity.listByEntity).not.toHaveBeenCalled()
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false }, [])),
      )

      const result = await ActivityService.list(
        'actor',
        'ws1',
        'proj-slug',
        'ISSUE',
        'issue-1',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('record()', () => {
    it('should not throw when the repository fails', async () => {
      mockedActivity.record.mockResolvedValue(err(databaseError()))

      await expect(
        ActivityService.record({
          entityType: 'ISSUE',
          entityId: 'issue-1',
          actorId: 'actor',
          field: 'priority',
          newValue: 'HIGH',
        }),
      ).resolves.toBeUndefined()
    })

    it('should call the repository with the given input', async () => {
      mockedActivity.record.mockResolvedValue(ok(createFakeActivity()))

      await ActivityService.record({
        entityType: 'ISSUE',
        entityId: 'issue-1',
        actorId: 'actor',
        field: 'priority',
        oldValue: 'NONE',
        newValue: 'HIGH',
      })

      expect(mockedActivity.record).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'priority', newValue: 'HIGH' }),
      )
    })
  })
})
