import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { createFakeState } from '@/src/__tests__/factories/state.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { StateRepository } from '@/src/repositories/state.repository'
import { StateService } from '../state.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/state.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedState = vi.mocked(StateRepository)

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
  members: { userId: string }[] = [],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

describe('StateService', () => {
  describe('list()', () => {
    it('should return states as DTOs for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true }, [{ userId: 'actor' }])),
      )
      mockedState.listByProject.mockResolvedValue(ok([createFakeState()]))

      const result = await StateService.list('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for private project an non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await StateService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a state when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedState.create.mockResolvedValue(ok(createFakeState()))

      const result = await StateService.create('actor', 'ws1', 'proj-slug', {
        name: 'Custom',
        group: 'STARTED',
        color: 'ZINC',
      })

      expectOk(result)
    })

    it('should return STATE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await StateService.create('actor', 'ws1', 'proj-slug', {
        name: 'Custom',
        group: 'STARTED',
        color: 'ZINC',
      })

      expectErr(result, 'STATE_FORBIDDEN')
      expect(mockedState.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedState.create.mockResolvedValue(err(databaseError()))

      const result = await StateService.create('actor', 'ws1', 'proj-slug', {
        name: 'Custom',
        group: 'STARTED',
        color: 'ZINC',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update a state when actor is lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ id: 'state-1', projectId: 'proj-1' })),
      )
      mockedState.update.mockResolvedValue(
        ok(createFakeState({ id: 'state-1', name: 'Renamed' })),
      )

      const result = await StateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
        { name: 'Renamed' },
      )

      expect(expectOk(result).name).toBe('Renamed')
    })

    it('should return STATE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await StateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'STATE_FORBIDDEN')
      expect(mockedState.findById).not.toHaveBeenCalled()
    })

    it('should return STATE_NOT_FOUND when state belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'other-proj' })),
      )

      const result = await StateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'STATE_NOT_FOUND')
    })

    it('should propagate repo update error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ id: 'state-1', projectId: 'proj-1' })),
      )
      mockedState.update.mockResolvedValue(err(databaseError()))

      const result = await StateService.update(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should return STATE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await StateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'STATE_FORBIDDEN')
      expect(mockedState.findById).not.toHaveBeenCalled()
    })

    it('should propagate repo error from countByGroup', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1', isDefault: false })),
      )
      mockedState.countByGroup.mockResolvedValue(err(databaseError()))

      const result = await StateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate repo delete error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1', isDefault: false })),
      )
      mockedState.countByGroup.mockResolvedValue(ok(2))
      mockedState.delete.mockResolvedValue(err(databaseError()))

      const result = await StateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return STATE_IS_DEFAULT when deleting the default state', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1', isDefault: true })),
      )

      const result = await StateService.delete(
        'actor',
        'ws1',
        'prj-slug',
        'state-1',
      )

      expectErr(result, 'STATE_IS_DEFAULT')
      expect(mockedState.delete).not.toHaveBeenCalled()
    })

    it('should return STATE_LAST_IN_GROUP when it is the only state in the group', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(
          createFakeState({
            projectId: 'proj-1',
            isDefault: false,
            group: 'STARTED',
          }),
        ),
      )
      mockedState.countByGroup.mockResolvedValue(ok(1))

      const result = await StateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'STATE_LAST_IN_GROUP')
      expect(mockedState.delete).not.toHaveBeenCalled()
    })

    it('should delete when there is more than one state in the group', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(
          createFakeState({
            projectId: 'proj-1',
            isDefault: false,
            group: 'STARTED',
          }),
        ),
      )
      mockedState.countByGroup.mockResolvedValue(ok(2))
      mockedState.delete.mockResolvedValue(ok(undefined))

      const result = await StateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectOk(result)
    })

    it('should return STATE_NOT_FOUND when state belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'other-proj' })),
      )

      const result = await StateService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'STATE_NOT_FOUND')
    })
  })

  describe('setDefault()', () => {
    it('should set a new default state', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedState.setDefault.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1', isDefault: true })),
      )

      const result = await StateService.setDefault(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expect(expectOk(result).isDefault).toBe(true)
    })

    it('should return STATE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await StateService.setDefault(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'STATE_FORBIDDEN')
      expect(mockedState.findById).not.toHaveBeenCalled()
    })

    it('should return STATE_NOT_FOUND when state belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'other-proj' })),
      )

      const result = await StateService.setDefault(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'STATE_NOT_FOUND')
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(projectWith()))
      mockedState.findById.mockResolvedValue(
        ok(createFakeState({ projectId: 'proj-1' })),
      )
      mockedState.setDefault.mockResolvedValue(err(databaseError()))

      const result = await StateService.setDefault(
        'actor',
        'ws1',
        'proj-slug',
        'state-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  it('should propagete membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )
    const result = await StateService.list('actor', 'ws1', 'pro-slug')

    expectErr(result, 'DATABASE_ERROR')
  })
})
