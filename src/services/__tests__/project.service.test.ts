import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectService } from '../project.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)

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

describe('ProjectService', () => {
  describe('list()', () => {
    it('should return projects as DTOs for workspace member', async () => {
      const projects = [
        { ...createFakeProject({ workspaceId: 'ws1' }), members: [] as[], favourites: [] as [] },
      ]
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.listByWorkspace.mockResolvedValue(ok(projects))

      const result = await ProjectService.list('actor', 'ws1', {
        archived: false,
      })

      const dtos = expectOk(result)
      expect(dtos).toHaveLength(1)
      expect(mockedProject.listByWorkspace).toHaveBeenCalledWith(
        'ws1',
        'actor',
        false,
        { archived: false },
      )
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectService.list('actor', 'ws1', {
        archived: false,
      })

      expectErr(result, 'FORBIDDEN')
    })
  })

  describe('getBySlug()', () => {
    it('should return public project to any workspace member', async () => {
      const project = createFakeProject({
        isPublic: true,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })

    it('should return PROJECT_FORBIDDEN for private project when actor is not a member', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectErr(result, 'PROJECT_FORBIDDEN')
    })

    it('should return private project to its lead', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'actor',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })

    it('should return private project to OWNER regardless of membership', async () => {
      const project = createFakeProject({
        isPublic: false,
        workspaceId: 'ws1',
        leadId: 'other',
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.getBySlug(
        'actor',
        'ws1',
        project.slug,
      )

      expectOk(result)
    })
  })

  describe('create()', () => {
    it('should create project with actor as lead', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.create.mockResolvedValue(ok(project))

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
      })

      const dto = expectOk(result)
      expect(dto.leadId).toBe('actor')
      expect(mockedProject.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: 'actor', workspaceId: 'ws1' }),
      )
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await ProjectService.create('actor', 'ws1', {
        name: 'New Project',
        slug: 'new-project',
        isPublic: false,
      })
      expectErr(result, 'FORBIDDEN')
    })
  })

  describe('update()', () => {
    it('should allow lead to update project', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      const updated = { ...project, name: 'Updated' }
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.update.mockResolvedValue(ok(updated))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'Updated',
      })

      const dto = expectOk(result)
      expect(dto.name).toBe('Updated')
      expect(dto.leadId).toBe('actor')
    })

    it('should return PROJECT_FORBIDDEN when non-lead MEMBER tries to update', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'Hack',
      })

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.update).not.toHaveBeenCalled()
    })

    it('should allow OWNER to update any project', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.update.mockResolvedValue(ok(project))

      const result = await ProjectService.update('actor', 'ws1', project.slug, {
        name: 'Fixed',
      })

      expectOk(result)
    })
  })

  describe('archive()', () => {
    it('should archive when actor is lead', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      const archived = { ...project, archivedAt: new Date() }
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.archive.mockResolvedValue(ok(archived))

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      const dto = expectOk(result)
      expect(dto.archivedAt).not.toBeNull()
    })

    it('should return PROJECT_FORBIDDEN for non-lead MEMBER', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.archive.mockResolvedValue(ok(project))

      const result = await ProjectService.archive('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
    })
  })

  describe('restore()', () => {
    it('should restore when actor is lead', async () => {
      const project = createFakeProject({
        leadId: 'actor',
        workspaceId: 'ws1',
        archivedAt: new Date(),
      })
      const restored = { ...project, archivedAt: null }
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.restore.mockResolvedValue(ok(restored))

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      const dto = expectOk(result)
      expect(dto.archivedAt).toBeNull()
    })

    it('should return PROJECT_FORBIDDEN for non-lead MEMBER', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )

      const result = await ProjectService.restore('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.restore).not.toHaveBeenCalled()
    })
  })

  describe('delete()', () => {
    it('should allow OWNER to hard-delete', async () => {
      const project = createFakeProject({ leadId: 'actor', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.delete.mockResolvedValue(ok(undefined))

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectOk(result)
    })

    it('should return PROJECT_FORBIDDEN for non-OWNER', async () => {
      const project = createFakeProject({ leadId: 'other', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.delete.mockResolvedValue(ok(undefined))

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectErr(result, 'PROJECT_FORBIDDEN')
      expect(mockedProject.delete).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      const project = createFakeProject({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(ownerMembership),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok({ ...project, members: [], favourites: [] as [] }),
      )
      mockedProject.delete.mockResolvedValue(err(databaseError()))

      const result = await ProjectService.delete('actor', 'ws1', project.slug)

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
