import { describe, expect, it, vi } from 'vitest'
import { createFakeCycle } from '@/src/__tests__/factories/cycle.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { CycleRepository } from '@/src/repositories/cycle.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { CycleService } from '../cycle.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/cycle.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedCycle = vi.mocked(CycleRepository)

const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})
const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members: [] as { userId: string }[],
    favourites: [] as { id: string }[],
  }
}

describe('CycleService', () => {
  describe('list()', () => {
    it('should return cycles as DTOs for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedCycle.listByProject.mockResolvedValue(ok([createFakeCycle()]))

      const result = await CycleService.list('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await CycleService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a cycle with actor as lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedCycle.create.mockResolvedValue(
        ok(createFakeCycle({ leadId: 'actor' })),
      )

      const result = await CycleService.create('actor', 'ws1', 'proj-slug', {
        name: 'Sprint 1',
        status: 'NOT_STARTED',
      })

      expect(expectOk(result).leadId).toBe('actor')
    })

    it('should return CYCLE_ALREADY_ACTIVE when creating antoher IN_PROGRESS cycle', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedCycle.findActiveByProject.mockResolvedValue(
        ok(createFakeCycle({ status: 'IN_PROGRESS' })),
      )

      const result = await CycleService.create('actor', 'ws1', 'proj-slug', {
        name: 'Sprint 2',
        status: 'IN_PROGRESS',
      })

      expectErr(result, 'CYCLE_ALREADY_ACTIVE')
      expect(mockedCycle.create).not.toHaveBeenCalled()
    })

    it('should return CYCLE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await CycleService.create('actor', 'ws1', 'proj-slug', {
        name: 'Sprint 1',
        status: 'NOT_STARTED',
      })

      expectErr(result, 'CYCLE_FORBIDDEN')
      expect(mockedCycle.create).not.toHaveBeenCalled()
    })
  })

  describe('update()', () => {
    it('should return CYCLE_NOT_FOUND when cycle belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ projectId: 'other-proj' })),
      )

      const result = await CycleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'cyc-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'CYCLE_NOT_FOUND')
    })

    it('should allow moving the same cycle to IN_PROGRESS when it is already the active one', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ id: 'cyc-1', projectId: 'proj-1' })),
      )
      mockedCycle.findActiveByProject.mockResolvedValue(
        ok(createFakeCycle({ id: 'cyc-1', status: 'IN_PROGRESS' })),
      )
      mockedCycle.update.mockResolvedValue(
        ok(createFakeCycle({ id: 'cyc-1', status: 'IN_PROGRESS' })),
      )

      const result = await CycleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'cyc-1',
        { status: 'IN_PROGRESS' },
      )

      expectOk(result)
    })

    it('should CYCLE_ALREADY_ACTIVE when another cycle is already in progress', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ id: 'cyc-2', projectId: 'proj-1' })),
      )
      mockedCycle.findActiveByProject.mockResolvedValue(
        ok(createFakeCycle({ id: 'cyc-1', status: 'IN_PROGRESS' })),
      )

      const result = await CycleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'cyc-2',
        { status: 'IN_PROGRESS' },
      )

      expectErr(result, 'CYCLE_ALREADY_ACTIVE')
      expect(mockedCycle.update).not.toHaveBeenCalled()
    })
  })

  describe('delete()', () => {
    it('should delete when actor is privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ id: 'cyc-1', projectId: 'proj-1' })),
      )
      mockedCycle.delete.mockResolvedValue(ok(undefined))

      const result = await CycleService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'cyc-1',
      )

      expectOk(result)
    })
  })

  describe('addMember() / removeMember()', () => {
    it('should block removing the cycle lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedCycle.findById.mockResolvedValue(
        ok(createFakeCycle({ projectId: 'proj-1', leadId: 'lead-1' })),
      )

      const result = await CycleService.removeMember(
        'actor',
        'ws1',
        'proj-slug',
        'cyc-1',
        'lead-1',
      )

      expectErr(result, 'CYCLE_FORBIDDEN')
      expect(mockedCycle.removeMember).not.toHaveBeenCalled()
    })
  })

  it('should propagate membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )

    const result = await CycleService.list('actor', 'ws1', 'proj-slug')

    expectErr(result, 'DATABASE_ERROR')
  })
})
