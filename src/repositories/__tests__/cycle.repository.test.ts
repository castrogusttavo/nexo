import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  seedCycle,
  seedCycleMember,
} from '@/src/__tests__/factories/cycle.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { CycleRepository } from '../cycle.repository'

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

describe('CycleRepository', () => {
  describe('findByid()', () => {
    it('should return cycle when it exists', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedCycle(project.id, user.id, { name: 'Sprint 1' })

      const result = await CycleRepository.findById(seeded.id)

      expect(expectOk(result).name).toBe('Sprint 1')
    })

    it('should return CYCLE_NOT_FOUND when cycle does no exist', async () => {
      const result = await CycleRepository.findById('nonexistent')
      expectErr(result, 'CYCLE_NOT_FOUND')
    })
  })

  describe('listByProject()', () => {
    it('should list cycles for a project', async () => {
      const { user, project } = await setupProject()
      await seedCycle(project.id, user.id, { name: 'Sprint 1' })
      await seedCycle(project.id, user.id, { name: 'Sprint 2' })

      const result = await CycleRepository.listByProject(project.id)

      expect(expectOk(result)).toHaveLength(2)
    })
  })

  describe('findActiveByProject', () => {
    it('should return the in-progress cycle', async () => {
      const { user, project } = await setupProject()
      await seedCycle(project.id, user.id, { status: 'NOT_STARTED' })
      const active = await seedCycle(project.id, user.id, {
        status: 'IN_PROGRESS',
      })

      const result = await CycleRepository.findActiveByProject(project.id)

      expect(expectOk(result)?.id).toBe(active.id)
    })

    it('should return null when there is no active cycle', async () => {
      const { user, project } = await setupProject()
      await seedCycle(project.id, user.id, { status: 'NOT_STARTED' })

      const result = await CycleRepository.findActiveByProject(project.id)

      expect(expectOk(result)).toBeNull()
    })
  })

  describe('create()', () => {
    it('should persist cycle and auto-add lead as member', async () => {
      const { user, project } = await setupProject()

      const result = await CycleRepository.create({
        name: 'New Cycle',
        leadId: user.id,
        projectId: project.id,
      })

      const cycle = expectOk(result)
      expect(cycle.leadId).toBe(user.id)

      const membersResult = await CycleRepository.listmembers(cycle.id)
      const members = expectOk(membersResult)
      expect(members).toHaveLength(1)
      expect(members[0].userId).toBe(user.id)
    })
  })

  describe('update()', () => {
    it('should update cycle fields', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedCycle(project.id, user.id)

      const result = await CycleRepository.update(seeded.id, {
        status: 'IN_PROGRESS',
      })

      expect(expectOk(result).status).toBe('IN_PROGRESS')
    })
  })

  describe('delete()', () => {
    it('should remove the cycle', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedCycle(project.id, user.id)

      await CycleRepository.delete(seeded.id)

      const result = await CycleRepository.findById(seeded.id)
      expectErr(result, 'CYCLE_NOT_FOUND')
    })
  })

  describe('member', () => {
    it('should add and remove a member', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedCycle(project.id, user.id)
      const other = await seedUser()

      const added = await CycleRepository.addMember(other.id, seeded.id)
      expect(expectOk(added).userId).toBe(other.id)

      const removed = await CycleRepository.removeMember(other.id, seeded.id)
      expectOk(removed)
    })

    it('should return CYCLE_MEMBER_ALREADY_EXISTS on duplicate add', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedCycle(project.id, user.id)
      const other = await seedUser()
      await seedCycleMember({ userId: other.id, cycleId: seeded.id })

      const result = await CycleRepository.addMember(other.id, seeded.id)

      expectErr(result, 'CYCLE_MEMBER_ALREADY_EXISTS')
    })

    it('should return CYCLE_MEMBER_NOT_FOUND when removing a non-member', async () => {
      const { user, project } = await setupProject()
      const seeded = await seedCycle(project.id, user.id)
      const other = await seedUser()

      const result = await CycleRepository.removeMember(other.id, seeded.id)

      expectErr(result, 'CYCLE_MEMBER_NOT_FOUND')
    })
  })

  describe('query failures', () => {
    it('findById() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycle, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await CycleRepository.findById('c'), 'DATABASE_ERROR')
    })

    it('listByProject() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycle, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await CycleRepository.listByProject('p'), 'DATABASE_ERROR')
    })

    it('findActiveByProject() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycle, 'findFirst').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await CycleRepository.findActiveByProject('p'),
        'DATABASE_ERROR',
      )
    })

    it('listmembers() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycleMember, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await CycleRepository.listmembers('c'), 'DATABASE_ERROR')
    })

    it('addMember() returns DATABASE_ERROR for a non-conflict failure', async () => {
      vi.spyOn(prisma.cycleMember, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await CycleRepository.addMember('u', 'c'), 'DATABASE_ERROR')
    })

    it('removeMember() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycleMember, 'deleteMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await CycleRepository.removeMember('u', 'c'), 'DATABASE_ERROR')
    })

    it('create() returns DATABASE_ERROR when the transaction throws', async () => {
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await CycleRepository.create({
          name: 'X',
          leadId: 'u',
          projectId: 'p',
        }),
        'DATABASE_ERROR',
      )
    })

    it('update() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycle, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await CycleRepository.update('c', { name: 'X' }),
        'DATABASE_ERROR',
      )
    })

    it('delete() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.cycle, 'delete').mockRejectedValueOnce(new Error('boom'))
      expectErr(await CycleRepository.delete('c'), 'DATABASE_ERROR')
    })
  })
})
