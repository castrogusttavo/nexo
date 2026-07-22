import { describe, expect, it, vi } from 'vitest'
import { createFakeLabel } from '@/src/__tests__/factories/label.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { LabelRepository } from '@/src/repositories/label.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { LabelService } from '../label.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/label.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedLabel = vi.mocked(LabelRepository)

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

describe('LabelService', () => {
  describe('list()', () => {
    it('should return labels as DTOs for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true })),
      )
      mockedLabel.listByProject.mockResolvedValue(ok([createFakeLabel()]))

      const result = await LabelService.list('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for a private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await LabelService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a label when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedLabel.create.mockResolvedValue(ok(createFakeLabel()))

      const result = await LabelService.create('actor', 'ws1', 'proj-slug', {
        name: 'Bug',
        color: 'RED',
      })

      expectOk(result)
    })

    it('should return LABEL_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await LabelService.create('actor', 'ws1', 'proj-slug', {
        name: 'Bug',
        color: 'RED',
      })

      expectErr(result, 'LABEL_FORBIDDEN')
      expect(mockedLabel.create).not.toHaveBeenCalled()
    })
  })

  describe('update()', () => {
    it('should return LABEL_NOT_FOUND when label belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedLabel.findById.mockResolvedValue(
        ok(createFakeLabel({ projectId: 'other-proj' })),
      )

      const result = await LabelService.update(
        'actor',
        'ws1',
        'proj-slug',
        'label',
        { name: 'Renamed' },
      )

      expectErr(result, 'LABEL_NOT_FOUND')
    })

    it('should update when label belongs to the resolved project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedLabel.findById.mockResolvedValue(
        ok(createFakeLabel({ projectId: 'proj-1' })),
      )
      mockedLabel.update.mockResolvedValue(
        ok(createFakeLabel({ projectId: 'proj-1', name: 'Renamed' })),
      )

      const result = await LabelService.update(
        'actor',
        'ws1',
        'proj-slug',
        'label-1',
        { name: 'Renamed' },
      )

      expect(expectOk(result).name).toBe('Renamed')
    })
  })

  describe('delete()', () => {
    it('should delete whena actor is privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedLabel.findById.mockResolvedValue(
        ok(createFakeLabel({ projectId: 'proj-1' })),
      )
      mockedLabel.delete.mockResolvedValue(ok(undefined))

      const result = await LabelService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'label-1',
      )

      expectOk(result)
    })
  })

  it('should propagate membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )

    const result = await LabelService.list('actor', 'ws1', 'proj-slug')

    expectErr(result, 'DATABASE_ERROR')
  })
})
