import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  defaultProjectStateId,
  seedProjectState,
} from '@/src/__tests__/factories/project-state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { ProjectStateRepository } from '../project-state.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectStateRepository', () => {
  describe('findById()', () => {
    it('should return the state when it exists', async () => {
      const ws = await seedWorkspace()
      const seeded = await seedProjectState(ws.id, { name: 'Em revisão' })

      const state = expectOk(await ProjectStateRepository.findById(seeded.id))

      expect(state.name).toBe('Em revisão')
    })

    it('should return PROJECT_STATE_NOT_FOUND when it does not exist', async () => {
      const result = await ProjectStateRepository.findById('nonexistent')

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
    })
  })

  describe('listByWorkspace()', () => {
    it('should list by group, then order', async () => {
      const ws = await seedWorkspace()
      await seedProjectState(ws.id, { name: 'Feito', group: 'COMPLETED' })
      await seedProjectState(ws.id, {
        name: 'Execução B',
        group: 'EXECUTION',
        order: 1,
      })
      await seedProjectState(ws.id, {
        name: 'Execução A',
        group: 'EXECUTION',
        order: 0,
      })
      await seedProjectState(ws.id, { name: 'Ideia', group: 'DRAFT' })

      const states = expectOk(
        await ProjectStateRepository.listByWorkspace(ws.id),
      )

      expect(states.map((s) => s.name)).toEqual([
        'Ideia',
        'Execução A',
        'Execução B',
        'Feito',
      ])
    })

    it('should list only the states of that workspace', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      await seedProjectState(ws.id, { name: 'Nosso' })
      await seedProjectState(other.id, { name: 'Deles' })

      const states = expectOk(
        await ProjectStateRepository.listByWorkspace(ws.id),
      )

      expect(states.map((s) => s.name)).toEqual(['Nosso'])
    })
  })

  describe('countByGroup()', () => {
    it('should count the group within the workspace only', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      await seedProjectState(ws.id, { group: 'PLANNING' })
      await seedProjectState(ws.id, { group: 'PLANNING' })
      await seedProjectState(ws.id, { group: 'DRAFT' })
      await seedProjectState(other.id, { group: 'PLANNING' })

      const count = expectOk(
        await ProjectStateRepository.countByGroup(ws.id, 'PLANNING'),
      )

      expect(count).toBe(2)
    })
  })

  describe('create()', () => {
    it('should persist a state that is not the default', async () => {
      const ws = await seedWorkspace()

      const state = expectOk(
        await ProjectStateRepository.create({
          workspaceId: ws.id,
          name: 'Em revisão',
          group: 'MONITORING',
          color: 'PURPLE',
        }),
      )

      expect(state).toMatchObject({
        name: 'Em revisão',
        group: 'MONITORING',
        color: 'PURPLE',
        isDefault: false,
        workspaceId: ws.id,
      })
    })

    it('should return PROJECT_STATE_ALREADY_EXISTS for a name taken in the workspace', async () => {
      const ws = await seedWorkspace()
      await seedProjectState(ws.id, { name: 'Em revisão' })

      const result = await ProjectStateRepository.create({
        workspaceId: ws.id,
        name: 'Em revisão',
        group: 'MONITORING',
        color: 'PURPLE',
      })

      expectErr(result, 'PROJECT_STATE_ALREADY_EXISTS')
    })

    it('should accept a name another workspace already uses', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      await seedProjectState(other.id, { name: 'Em revisão' })

      const result = await ProjectStateRepository.create({
        workspaceId: ws.id,
        name: 'Em revisão',
        group: 'DRAFT',
        color: 'ZINC',
      })

      expectOk(result)
    })
  })

  describe('update()', () => {
    it('should update the given fields', async () => {
      const ws = await seedWorkspace()
      const seeded = await seedProjectState(ws.id, { name: 'Antigo' })

      const state = expectOk(
        await ProjectStateRepository.update(seeded.id, {
          name: 'Novo',
          color: 'GREEN',
          order: 4,
        }),
      )

      expect(state).toMatchObject({
        name: 'Novo',
        color: 'GREEN',
        order: 4,
      })
    })

    it('should return PROJECT_STATE_ALREADY_EXISTS when renaming onto a taken name', async () => {
      const ws = await seedWorkspace()
      await seedProjectState(ws.id, { name: 'Ocupado' })
      const seeded = await seedProjectState(ws.id, { name: 'Livre' })

      const result = await ProjectStateRepository.update(seeded.id, {
        name: 'Ocupado',
      })

      expectErr(result, 'PROJECT_STATE_ALREADY_EXISTS')
    })

    it('should return DATABASE_ERROR for a nonexistent id', async () => {
      const result = await ProjectStateRepository.update('nonexistent', {
        name: 'Novo',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('setDefault()', () => {
    it('should move the default within the workspace', async () => {
      const ws = await seedWorkspace()
      const previous = await seedProjectState(ws.id, { isDefault: true })
      const next = await seedProjectState(ws.id, { group: 'PLANNING' })

      const state = expectOk(
        await ProjectStateRepository.setDefault(next.id, ws.id),
      )

      expect(state.isDefault).toBe(true)
      const defaults = await prisma.projectState.findMany({
        where: { workspaceId: ws.id, isDefault: true },
      })
      expect(defaults.map((s) => s.id)).toEqual([next.id])
      expect(defaults.map((s) => s.id)).not.toContain(previous.id)
    })

    it('should leave another workspace default alone', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      const otherDefault = await seedProjectState(other.id, { isDefault: true })
      const next = await seedProjectState(ws.id)

      expectOk(await ProjectStateRepository.setDefault(next.id, ws.id))

      const untouched = await prisma.projectState.findUniqueOrThrow({
        where: { id: otherDefault.id },
      })
      expect(untouched.isDefault).toBe(true)
    })

    it('should return DATABASE_ERROR for a nonexistent id', async () => {
      const ws = await seedWorkspace()

      const result = await ProjectStateRepository.setDefault(
        'nonexistent',
        ws.id,
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('deleteMovingProjects()', () => {
    async function workspaceWithLead() {
      const lead = await seedUser()
      const ws = await seedWorkspace()
      return { lead, ws }
    }

    it('should move the projects to another state of the group, then delete', async () => {
      const { lead, ws } = await workspaceWithLead()
      const doomed = await seedProjectState(ws.id, { group: 'EXECUTION' })
      const kept = await seedProjectState(ws.id, { group: 'EXECUTION' })
      const project = await seedProject(ws.id, lead.id, { stateId: doomed.id })

      const moved = expectOk(
        await ProjectStateRepository.deleteMovingProjects(doomed.id),
      )

      expect(moved).toEqual({ movedTo: kept.id, count: 1 })
      const after = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      })
      expect(after.stateId).toBe(kept.id)
      expect(
        await prisma.projectState.findUnique({
          where: { id: doomed.id },
        }),
      ).toBeNull()
    })

    it('should pick the lowest order in the group', async () => {
      const { lead, ws } = await workspaceWithLead()
      const doomed = await seedProjectState(ws.id, {
        group: 'EXECUTION',
        order: 0,
      })
      await seedProjectState(ws.id, { group: 'EXECUTION', order: 5 })
      const first = await seedProjectState(ws.id, {
        group: 'EXECUTION',
        order: 1,
      })
      await seedProject(ws.id, lead.id, { stateId: doomed.id })

      const moved = expectOk(
        await ProjectStateRepository.deleteMovingProjects(doomed.id),
      )

      expect(moved.movedTo).toBe(first.id)
    })

    it('should never move projects into another workspace', async () => {
      const { lead, ws } = await workspaceWithLead()
      const other = await seedWorkspace()
      const doomed = await seedProjectState(ws.id, {
        group: 'EXECUTION',
        order: 5,
      })
      const kept = await seedProjectState(ws.id, {
        group: 'EXECUTION',
        order: 9,
      })
      await seedProjectState(other.id, { group: 'EXECUTION', order: 0 })
      await seedProject(ws.id, lead.id, { stateId: doomed.id })

      const moved = expectOk(
        await ProjectStateRepository.deleteMovingProjects(doomed.id),
      )

      expect(moved.movedTo).toBe(kept.id)
    })

    it('should delete an unused state and move nothing', async () => {
      const { ws } = await workspaceWithLead()
      const doomed = await seedProjectState(ws.id, { group: 'PLANNING' })
      const kept = await seedProjectState(ws.id, { group: 'PLANNING' })

      const moved = expectOk(
        await ProjectStateRepository.deleteMovingProjects(doomed.id),
      )

      expect(moved).toEqual({ movedTo: kept.id, count: 0 })
    })

    // The service refuses this first; the repository must not lean on it,
    // or a race would leave the projects pointing at nothing.
    it('should return PROJECT_STATE_LAST_IN_GROUP and keep everything for the last state', async () => {
      const { lead, ws } = await workspaceWithLead()
      const only = await seedProjectState(ws.id, { group: 'CANCELLED' })
      const project = await seedProject(ws.id, lead.id, { stateId: only.id })

      const result = await ProjectStateRepository.deleteMovingProjects(only.id)

      expectErr(result, 'PROJECT_STATE_LAST_IN_GROUP')
      const after = await prisma.project.findUniqueOrThrow({
        where: { id: project.id },
      })
      expect(after.stateId).toBe(only.id)
    })

    it('should return PROJECT_STATE_NOT_FOUND for a nonexistent id', async () => {
      const result =
        await ProjectStateRepository.deleteMovingProjects('nonexistent')

      expectErr(result, 'PROJECT_STATE_NOT_FOUND')
    })
  })

  // The FK is NO ACTION so a workspace delete can cascade into projects and
  // project_states in either order; RESTRICT would fail here.
  describe('workspace delete', () => {
    it('should remove the workspace with its states and projects', async () => {
      const lead = await seedUser()
      const ws = await seedWorkspace()
      const stateId = await defaultProjectStateId(ws.id)
      await seedProject(ws.id, lead.id, { stateId })

      await prisma.workspace.delete({ where: { id: ws.id } })

      expect(
        await prisma.projectState.count({ where: { workspaceId: ws.id } }),
      ).toBe(0)
      expect(
        await prisma.project.count({ where: { workspaceId: ws.id } }),
      ).toBe(0)
    })
  })
})
