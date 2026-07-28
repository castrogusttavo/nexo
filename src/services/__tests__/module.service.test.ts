import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeModule } from '@/src/__tests__/factories/module.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ModuleRepository } from '@/src/repositories/module.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ModuleService } from '../module.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/module.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedModule = vi.mocked(ModuleRepository)

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

describe('ModuleService', () => {
  describe('list()', () => {
    it('should return modules as DTOs for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true }, [{ userId: 'actor' }])),
      )
      mockedModule.listByProject.mockResolvedValue(ok([createFakeModule()]))

      const result = await ModuleService.list('actor', 'ws1', 'proj-slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return PROJECT_FORBIDDEN for private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await ModuleService.list('actor', 'ws1', 'proj-slug')

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a module with actor as lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedModule.create.mockResolvedValue(
        ok(createFakeModule({ leadId: 'actor' })),
      )

      const result = await ModuleService.create('actor', 'ws1', 'projc-slug', {
        name: 'Auth',
        status: 'BACKLOG',
      })

      expect(expectOk(result).leadId).toBe('actor')
      expect(mockedModule.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: 'actor', projectId: 'proj-1' }),
      )
    })

    it('should return MODULE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await ModuleService.create('actor', 'ws1', 'proj-slug', {
        name: 'Auth',
        status: 'BACKLOG',
      })

      expectErr(result, 'MODULE_FORBIDDEN')
      expect(mockedModule.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error when creation fails', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'actor' })),
      )
      mockedModule.create.mockResolvedValue(err(databaseError()))

      const result = await ModuleService.create('actor', 'ws1', 'proj-slug', {
        name: 'Auth',
        status: 'BACKLOG',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should return MODULE_NOT_FOUND when module belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'MODULE_NOT_FOUND')
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
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedModule.delete.mockResolvedValue(ok(undefined))

      const result = await ModuleService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectOk(result)
    })
  })

  describe('addMember() / removeMember()', () => {
    it('should add a member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1', leadId: 'lead-1' })),
      )
      mockedModule.addMember.mockResolvedValue(
        ok({
          id: 'mm-1',
          userId: 'other',
          moduleId: 'mod-1',
          createdAt: new Date(),
          user: { id: 'other', name: 'Other', username: 'other', image: null },
        }),
      )

      const result = await ModuleService.addMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectOk(result)
    })

    it('should block removing the module lead', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1', leadId: 'lead-1' })),
      )

      const result = await ModuleService.removeMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'lead-1',
      )

      expectErr(result, 'MODULE_FORBIDDEN')
      expect(mockedModule.removeMember).not.toHaveBeenCalled()
    })
  })

  describe('favorite() / unfavorite()', () => {
    it('should favorite a module for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(
          projectWith({ isPublic: true, id: 'proj-1' }, [{ userId: 'actor' }]),
        ),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedModule.addFavorite.mockResolvedValue(ok(undefined))

      const result = await ModuleService.favorite(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expect(expectOk(result).favorited).toBe(true)
    })
  })

  it('should propagate membership repository error', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      err(databaseError()),
    )

    const result = await ModuleService.list('actor', 'ws1', 'proj-slug')

    expectErr(result, 'DATABASE_ERROR')
  })

  describe('update() edge cases', () => {
    it('should return MODULE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await ModuleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'MODULE_FORBIDDEN')
      expect(mockedModule.findById).not.toHaveBeenCalled()
    })

    it('should propagate repo update error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedModule.update.mockResolvedValue(err(databaseError()))

      const result = await ModuleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        { name: 'Renamed' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should clear dates when explicitly set to null', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedModule.update.mockResolvedValue(ok(createFakeModule()))

      await ModuleService.update(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        // Runtime accepts explicit null to clear dates even though the
        // schema type only allows omitting the field.
        { startDate: null, endDate: null } as unknown as Parameters<
          typeof ModuleService.update
        >[4],
      )

      expect(mockedModule.update).toHaveBeenCalledWith(
        'mod-1',
        expect.objectContaining({ startDate: null, endDate: null }),
      )
    })
  })

  describe('delete() edge cases', () => {
    it('should return MODULE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await ModuleService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'MODULE_FORBIDDEN')
    })

    it('should return MODULE_NOT_FOUND when module belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'MODULE_NOT_FOUND')
    })
  })

  describe('listMembers()', () => {
    it('should list members for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(
          projectWith({ isPublic: true, id: 'proj-1' }, [{ userId: 'actor' }]),
        ),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1', leadId: 'lead-1' })),
      )
      mockedModule.listMembers.mockResolvedValue(
        ok([
          {
            id: 'mm-1',
            userId: 'lead-1',
            moduleId: 'mod-1',
            createdAt: new Date(),
            user: {
              id: 'lead-1',
              name: 'Lead',
              username: 'lead',
              image: null,
            },
          },
        ]),
      )

      const result = await ModuleService.listMembers(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      const members = expectOk(result)
      expect(members).toHaveLength(1)
      expect(members[0].isLead).toBe(true)
    })

    it('should return PROJECT_FORBIDDEN for private project and non-member actor', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await ModuleService.listMembers(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedModule.findById).not.toHaveBeenCalled()
    })

    it('should return MODULE_NOT_FOUND when module belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true, id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.listMembers(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'MODULE_NOT_FOUND')
    })
  })

  describe('addMember() edge cases', () => {
    it('should return MODULE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await ModuleService.addMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectErr(result, 'MODULE_FORBIDDEN')
    })

    it('should return MODULE_NOT_FOUND when module belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.addMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectErr(result, 'MODULE_NOT_FOUND')
    })

    it('should propagate repo error when adding a member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedModule.addMember.mockResolvedValue(err(databaseError()))

      const result = await ModuleService.addMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('removeMember()', () => {
    it('should remove a non-lead member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1', leadId: 'lead-1' })),
      )
      mockedModule.removeMember.mockResolvedValue(ok(undefined))

      const result = await ModuleService.removeMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectOk(result)
      expect(mockedModule.removeMember).toHaveBeenCalledWith('other', 'mod-1')
    })

    it('should return MODULE_FORBIDDEN when actor is neither lead nor privileged', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' })),
      )

      const result = await ModuleService.removeMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectErr(result, 'MODULE_FORBIDDEN')
    })

    it('should return MODULE_NOT_FOUND when module belongs to a different project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.removeMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectErr(result, 'MODULE_NOT_FOUND')
    })

    it('should propagate repo error when removing a member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1', leadId: 'lead-1' })),
      )
      mockedModule.removeMember.mockResolvedValue(err(databaseError()))

      const result = await ModuleService.removeMember(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
        'other',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('favorite() / unfavorite() edge cases', () => {
    it('should return PROJECT_FORBIDDEN for private project and non-member actor on favorite', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await ModuleService.favorite(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should return MODULE_NOT_FOUND when favoriting a module from another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true, id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.favorite(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'MODULE_NOT_FOUND')
    })

    it('should return MODULE_NOT_FOUND when unfavoriting a module from another project', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: true, id: 'proj-1' })),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'other-proj' })),
      )

      const result = await ModuleService.unfavorite(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'MODULE_NOT_FOUND')
    })

    it('should unfavorite a module for a project member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(
          projectWith({ isPublic: true, id: 'proj-1' }, [{ userId: 'actor' }]),
        ),
      )
      mockedModule.findById.mockResolvedValue(
        ok(createFakeModule({ projectId: 'proj-1' })),
      )
      mockedModule.removeFavorite.mockResolvedValue(ok(undefined))

      const result = await ModuleService.unfavorite(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expect(expectOk(result).favorited).toBe(false)
    })

    it('should return PROJECT_FORBIDDEN for private project and non-member actor on unfavorite', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ isPublic: false })),
      )

      const result = await ModuleService.unfavorite(
        'actor',
        'ws1',
        'proj-slug',
        'mod-1',
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })
})
