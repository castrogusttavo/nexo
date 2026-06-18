import { describe, expect, it } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import {
  seedProject,
  seedProjectMember,
} from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ProjectRepository } from '../project.repository'

describe('ProjectRepository', () => {
  describe('findById()', () => {
    it('should return project when it exists', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      await seedMembership({
        userId: user.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })
      const seeded = await seedProject(ws.id, user.id, { name: 'My Project' })

      const result = await ProjectRepository.findById(seeded.id)

      const project = expectOk(result)
      expect(project.id).toBe(seeded.id)
      expect(project.name).toBe('My Project')
    })

    it('should return PROJECT_NOT_FOUND when project does not exist', async () => {
      const result = await ProjectRepository.findById('nonexistent')
      expectErr(result, 'PROJECT_NOT_FOUND')
    })
  })

  describe('findByWorkspaceAndSlug()', () => {
    it('should return project with members when found', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      const project = await seedProject(ws.id, user.id, { slug: 'my-proj' })
      await seedProjectMember({ userId: user.id, projectId: project.id })

      const result = await ProjectRepository.findByWorkspaceAndSlug(
        ws.id,
        'my-proj',
      )

      const p = expectOk(result)
      expect(p.slug).toBe('my-proj')
      expect(p.members.some((m) => m.userId === user.id)).toBe(true)
    })

    it('should return PROJECT_NOT_FOUND for unknown slug', async () => {
      const ws = await seedWorkspace()
      const result = await ProjectRepository.findByWorkspaceAndSlug(
        ws.id,
        'ghost',
      )
      expectErr(result, 'PROJECT_NOT_FOUND')
    })
  })

  describe('listByWorkspace()', () => {
    it('should return public projects for non-privileged member', async () => {
      const [owner, member] = await Promise.all([seedUser(), seedUser()])
      const ws = await seedWorkspace()
      await seedProject(ws.id, owner.id, {
        slug: 'public-proj',
        isPublic: true,
      })
      await seedProject(ws.id, owner.id, {
        slug: 'private-proj',
        isPublic: false,
      })

      const result = await ProjectRepository.listByWorkspace(
        ws.id,
        member.id,
        false,
        { archived: false },
      )

      const list = expectOk(result)
      expect(list.map((p) => p.slug)).toContain('public-proj')
      expect(list.map((p) => p.slug)).not.toContain('private-proj')
    })

    it('should return all projects for privileged member', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      await seedProject(ws.id, user.id, { slug: 'public-proj', isPublic: true })
      await seedProject(ws.id, user.id, {
        slug: 'private-proj',
        isPublic: false,
      })

      const result = await ProjectRepository.listByWorkspace(
        ws.id,
        user.id,
        true,
        { archived: false },
      )

      const list = expectOk(result)
      expect(list).toHaveLength(2)
    })

    it('should include own private project even without privilege', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      await seedProject(ws.id, user.id, { slug: 'my-private', isPublic: false })

      const result = await ProjectRepository.listByWorkspace(
        ws.id,
        user.id,
        false,
        { archived: false },
      )

      const list = expectOk(result)
      expect(list.map((p) => p.slug)).toContain('my-private')
    })

    it('should return archived projects when archived=true', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      await seedProject(ws.id, user.id, { slug: 'active-proj' })
      await seedProject(ws.id, user.id, {
        slug: 'archived-proj',
        archivedAt: new Date(),
      })

      const result = await ProjectRepository.listByWorkspace(
        ws.id,
        user.id,
        true,
        { archived: true },
      )

      const list = expectOk(result)
      expect(list.map((p) => p.slug)).toContain('archived-proj')
      expect(list.map((p) => p.slug)).not.toContain('active-proj')
    })
  })

  describe('create()', () => {
    it('should presist project and auto-add lead as member', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()

      const result = await ProjectRepository.create({
        name: 'New Project',
        slug: 'new-proj',
        isPublic: false,
        leadId: user.id,
        workspaceId: ws.id,
      })

      const project = expectOk(result)
      expect(project.name).toBe('New Project')
      expect(project.leadId).toBe(user.id)

      const member = await seedProjectMember({
        userId: user.id,
        projectId: project.id,
      }).catch(() => null)
      // lead is already a member (P2002 conflict expected)
      expect(member).toBeNull()
    })

    it('should return PROJECT_SLUG_CONFLICT on duplicate workspace+slug', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      await seedProject(ws.id, user.id, { slug: 'dup-slug' })

      const result = await ProjectRepository.create({
        name: 'Duplicate',
        slug: 'dup-slug',
        isPublic: false,
        leadId: user.id,
        workspaceId: ws.id,
      })

      expectErr(result, 'PROJECT_SLUG_CONFLICT')
    })
  })

  describe('archive() / restore()', () => {
    it('should set archivedAt on archive and clear it on restore', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      const project = await seedProject(ws.id, user.id)

      const archived = expectOk(await ProjectRepository.archive(project.id))
      expect(archived.archivedAt).not.toBeNull()

      const restored = expectOk(await ProjectRepository.restore(project.id))
      expect(restored.archivedAt).toBeNull()
    })
  })

  describe('delete()', () => {
    it('should hard-delete project', async () => {
      const user = await seedUser()
      const ws = await seedWorkspace()
      const project = await seedProject(ws.id, user.id)

      expectOk(await ProjectRepository.delete(project.id))

      const check = await ProjectRepository.findById(project.id)
      expectErr(check, 'PROJECT_NOT_FOUND')
    })
  })
})
