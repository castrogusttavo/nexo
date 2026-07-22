import { describe, expect, it, vi } from 'vitest'
import { createFakeEstimateSettings } from '@/src/__tests__/factories/estimate.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { EstimateRepository } from '@/src/repositories/estimate.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { EstimateService } from '../estimate.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/estimate.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedEstimate = vi.mocked(EstimateRepository)

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

describe('EstimateService', () => {
  describe('get()', () => {
    it('should return settings for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings()),
      )

      const result = await EstimateService.get('actor', 'ws1', 'proj-slug')

      expectOk(result)
    })

    it('should return PROJECT_FORBIDDEN for private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await EstimateService.get('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('update()', () => {
    it('should update when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimate.update.mockResolvedValue(
        ok(createFakeEstimateSettings({ system: 'TIME', model: 'HOURS' })),
      )

      const result = await EstimateService.update('actor', 'ws1', 'proj-slug', {
        system: 'TIME',
        model: 'HOURS',
      })

      expect(expectOk(result).system).toBe('TIME')
    })

    it('should return ESTIMATE_SETTINGS_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await EstimateService.update('actor', 'ws1', 'proj-slug', {
        system: 'TIME',
        model: 'HOURS',
      })

      expectErr(result, 'ESTIMATE_SETTINGS_FORBIDDEN')
      expect(mockedEstimate.update).not.toHaveBeenCalled()
    })
  })

  it('should propagate membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )

    const result = await EstimateService.get('actor', 'ws1', 'proj-slug')

    expectErr(result, 'DATABASE_ERROR')
  })
})
