import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import {
  seedModule,
  seedModuleMember,
} from '@/src/__tests__/factories/module.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { ModuleRepository } from '../module.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupProject() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, user.id)
  return { user, project }
}

describe('ModuleRepository', () => {
  describe('findById()', () => {
    it('should return module when it exists', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id, { name: 'Auth' })

      const result = await ModuleRepository.findById(seeded.id)

      expect(expectOk(result).name).toBe('Auth')
    })

    it('should return MODULE_NOT_FOUND when module does not exist', async () => {
      const result = await ModuleRepository.findById('nonexistent')
      expectErr(result, 'MODULE_NOT_FOUND')
    })
  })

  describe('listByProject()', () => {
    it('should list modules for a project', async () => {
      const { user, project } = await setupProject()
      await seedModule(project.id, user.id, { name: 'Auth' })
      await seedModule(project.id, user.id, { name: 'Billing' })

      const result = await ModuleRepository.listByProject(project.id)

      expect(expectOk(result)).toHaveLength(2)
    })
  })

  describe('create()', () => {
    it('should persist module and auto-add lead as member', async () => {
      const { user, project } = await setupProject()

      const result = await ModuleRepository.create({
        name: 'New Module',
        leadId: user.id,
        projectId: project.id,
      })

      const module = expectOk(result)
      expect(module.leadId).toBe(user.id)

      const membersResult = await ModuleRepository.listMembers(module.id)
      const members = expectOk(membersResult)
      expect(members).toHaveLength(1)
      expect(members[0].userId).toBe(user.id)
    })
  })

  describe('update()', () => {
    it('should update module fields', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id)

      const result = await ModuleRepository.update(seeded.id, {
        status: 'IN_PROGRESS',
        progress: 40,
      })

      const updated = expectOk(result)
      expect(updated.status).toBe('IN_PROGRESS')
      expect(updated.progress).toBe(40)
    })
  })

  describe('delete()', () => {
    it('should remove the module', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id)

      await ModuleRepository.delete(seeded.id)

      const result = await ModuleRepository.findById(seeded.id)
      expectErr(result, 'MODULE_NOT_FOUND')
    })
  })

  describe('members', () => {
    it('should add and remove a member', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id)
      const other = await seedUser()

      const added = await ModuleRepository.addMember(other.id, seeded.id)
      expect(expectOk(added).userId).toBe(other.id)

      const removed = await ModuleRepository.removeMember(other.id, seeded.id)
      expectOk(removed)
    })

    it('should return MODULE_ALREADY_EXISTS on duplicate add', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id)
      const other = await seedUser()
      await seedModuleMember({ userId: other.id, moduleId: seeded.id })

      const result = await ModuleRepository.addMember(other.id, seeded.id)

      expectErr(result, 'MODULE_MEMBER_ALREADY_EXISTS')
    })

    it('should return MODULE_MEMBER_NOT_FOUND when removing a non-member', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id)
      const other = await seedUser()

      const result = await ModuleRepository.removeMember(other.id, seeded.id)

      expectErr(result, 'MODULE_MEMBER_NOT_FOUND')
    })
  })

  describe('favorites', () => {
    it('should add and remove a favorite idempotently', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedModule(project.id, user.id)

      const added = await ModuleRepository.addFavorite(user.id, seeded.id)
      expectOk(added)
      const addedAgain = await ModuleRepository.addFavorite(user.id, seeded.id)
      expectOk(addedAgain)

      const removed = await ModuleRepository.removeFavorite(user.id, seeded.id)

      expectOk(removed)
    })
  })

  describe('query failures', () => {
    it('findById() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.module, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await ModuleRepository.findById('m'), 'DATABASE_ERROR')
    })

    it('listByProject() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.module, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await ModuleRepository.listByProject('p'), 'DATABASE_ERROR')
    })

    it('listMembers() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.moduleMember, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await ModuleRepository.listMembers('m'), 'DATABASE_ERROR')
    })

    it('addMember() returns DATABASE_ERROR for a non-conflict failure', async () => {
      vi.spyOn(prisma.moduleMember, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await ModuleRepository.addMember('u', 'm'), 'DATABASE_ERROR')
    })

    it('removeMember() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.moduleMember, 'deleteMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await ModuleRepository.removeMember('u', 'm'), 'DATABASE_ERROR')
    })

    it('create() returns DATABASE_ERROR when the transaction throws', async () => {
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await ModuleRepository.create({
          name: 'X',
          leadId: 'u',
          projectId: 'p',
        }),
        'DATABASE_ERROR',
      )
    })

    it('update() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.module, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await ModuleRepository.update('m', { name: 'X' }),
        'DATABASE_ERROR',
      )
    })

    it('delete() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.module, 'delete').mockRejectedValueOnce(new Error('boom'))
      expectErr(await ModuleRepository.delete('m'), 'DATABASE_ERROR')
    })

    it('addFavorite() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.moduleFavorite, 'upsert').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await ModuleRepository.addFavorite('u', 'm'), 'DATABASE_ERROR')
    })

    it('removeFavorite() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.moduleFavorite, 'deleteMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await ModuleRepository.removeFavorite('u', 'm'),
        'DATABASE_ERROR',
      )
    })
  })
})
