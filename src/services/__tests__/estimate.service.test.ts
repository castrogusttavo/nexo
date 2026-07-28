import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createFakeEstimateSettings,
  createFakeEstimateValue,
} from '@/src/__tests__/factories/estimate.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { EstimateRepository } from '@/src/repositories/estimate.repository'
import { EstimateValueRepository } from '@/src/repositories/estimate-value.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { EstimateService } from '../estimate.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/estimate.repository')
vi.mock('@/src/repositories/estimate-value.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedEstimate = vi.mocked(EstimateRepository)
const mockedEstimateValue = vi.mocked(EstimateValueRepository)

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

beforeEach(() => {
  mockedEstimateValue.listByEstimateSettingsId.mockResolvedValue(ok([]))
})

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

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimate.update.mockResolvedValue(err(databaseError()))

      const result = await EstimateService.update('actor', 'ws1', 'proj-slug', {
        system: 'TIME',
        model: 'HOURS',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('createValue()', () => {
    it('should create when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.create.mockResolvedValue(
        ok(createFakeEstimateValue({ value: '3' })),
      )

      const result = await EstimateService.createValue(
        'actor',
        'ws1',
        'proj-slug',
        {
          value: '3',
        },
      )

      expect(expectOk(result).value).toBe('3')
    })

    it('should return ESTIMATE_SETTINGS_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await EstimateService.createValue(
        'actor',
        'ws1',
        'proj-slug',
        {
          value: '3',
        },
      )

      expectErr(result, 'ESTIMATE_SETTINGS_FORBIDDEN')
      expect(mockedEstimateValue.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.create.mockResolvedValue(err(databaseError()))

      const result = await EstimateService.createValue(
        'actor',
        'ws1',
        'proj-slug',
        { value: '3' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('updateValue()', () => {
    it('should update when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({ id: 'val-1', estimateSettingsId: 'est-1' }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.update.mockResolvedValue(
        ok(createFakeEstimateValue({ id: 'val-1', value: '5' })),
      )

      const result = await EstimateService.updateValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
        { value: '5' },
      )

      expect(expectOk(result).value).toBe('5')
    })

    it('should return ESTIMATE_SETTINGS_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await EstimateService.updateValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
        { value: '5' },
      )

      expectErr(result, 'ESTIMATE_SETTINGS_FORBIDDEN')
      expect(mockedEstimateValue.findById).not.toHaveBeenCalled()
    })

    it('should propagate not found from repo', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(err(databaseError()))

      const result = await EstimateService.updateValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
        { value: '5' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return ESTIMATE_VALUE_FORBIDDEN when value belongs to another settings group', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({
            id: 'val-1',
            estimateSettingsId: 'other-est',
          }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )

      const result = await EstimateService.updateValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
        { value: '5' },
      )

      expectErr(result, 'ESTIMATE_VALUE_FORBIDDEN')
      expect(mockedEstimateValue.update).not.toHaveBeenCalled()
    })

    it('should propagate repo update error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({ id: 'val-1', estimateSettingsId: 'est-1' }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.update.mockResolvedValue(err(databaseError()))

      const result = await EstimateService.updateValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
        { value: '5' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('deleteValue()', () => {
    it('should delete when there is more than one value left', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({ id: 'val-1', estimateSettingsId: 'est-1' }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.countByEstimateSettingsId.mockResolvedValue(ok(2))
      mockedEstimateValue.delete.mockResolvedValue(ok(undefined))

      const result = await EstimateService.deleteValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
      )

      expectOk(result)
      expect(mockedEstimateValue.delete).toHaveBeenCalledWith('val-1')
    })

    it('should return ESTIMATE_SETTINGS_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await EstimateService.deleteValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
      )

      expectErr(result, 'ESTIMATE_SETTINGS_FORBIDDEN')
      expect(mockedEstimateValue.findById).not.toHaveBeenCalled()
    })

    it('should return ESTIMATE_VALUE_FORBIDDEN when value belongs to another settings group', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({
            id: 'val-1',
            estimateSettingsId: 'other-est',
          }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )

      const result = await EstimateService.deleteValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
      )

      expectErr(result, 'ESTIMATE_VALUE_FORBIDDEN')
    })

    it('should propagate repo delete error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({ id: 'val-1', estimateSettingsId: 'est-1' }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.countByEstimateSettingsId.mockResolvedValue(ok(2))
      mockedEstimateValue.delete.mockResolvedValue(err(databaseError()))

      const result = await EstimateService.deleteValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return ESTIMATE_VALUE_LAST_REMAINING when it is the only value left', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimateValue.findById.mockResolvedValue(
        ok(
          createFakeEstimateValue({ id: 'val-1', estimateSettingsId: 'est-1' }),
        ),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.countByEstimateSettingsId.mockResolvedValue(ok(1))

      const result = await EstimateService.deleteValue(
        'actor',
        'ws1',
        'proj-slug',
        'val-1',
      )

      expectErr(result, 'ESTIMATE_VALUE_LAST_REMAINING')
      expect(mockedEstimateValue.delete).not.toHaveBeenCalled()
    })
  })

  describe('reorderValues()', () => {
    it('should reorder when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.reorder.mockResolvedValue(
        ok([
          createFakeEstimateValue({ id: 'val-2', order: 0 }),
          createFakeEstimateValue({ id: 'val-1', order: 1 }),
        ]),
      )

      const result = await EstimateService.reorderValues(
        'actor',
        'ws1',
        'proj-slug',
        { valueIds: ['val-2', 'val-1'] },
      )

      expect(expectOk(result).map((v) => v.id)).toEqual(['val-2', 'val-1'])
    })

    it('should return ESTIMATE_SETTINGS_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await EstimateService.reorderValues(
        'actor',
        'ws1',
        'proj-slug',
        { valueIds: ['val-1'] },
      )

      expectErr(result, 'ESTIMATE_SETTINGS_FORBIDDEN')
      expect(mockedEstimateValue.reorder).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedEstimate.findByProjectId.mockResolvedValue(
        ok(createFakeEstimateSettings({ id: 'est-1' })),
      )
      mockedEstimateValue.reorder.mockResolvedValue(err(databaseError()))

      const result = await EstimateService.reorderValues(
        'actor',
        'ws1',
        'proj-slug',
        { valueIds: ['val-1'] },
      )

      expectErr(result, 'DATABASE_ERROR')
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
