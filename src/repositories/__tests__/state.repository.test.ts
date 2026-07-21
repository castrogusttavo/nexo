import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { StateRepository } from '../state.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupProject() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  return seedProject(ws.id, user.id)
}

describe('StateRepository', () => {
  describe('findById()', () => {
    it('should return state when it exists', async () => {
      const project = await setupProject()
      const seeded = await seedState(project.id, { name: 'In Progress' })

      const result = await StateRepository.findById(seeded.id)

      const state = expectOk(result)
      expect(state.name).toBe('In Progress')
    })

    it('should return STATRE_NOT_FOUND when state does not exist', async () => {
      const result = await StateRepository.findById('nonexistent')
      expectErr(result, 'STATE_NOT_FOUND')
    })
  })

  describe('listByProject()', () => {
    it('should list states ordered by group then order', async () => {
      const project = await setupProject()
      await seedState(project.id, {
        name: 'Done',
        group: 'COMPLETED',
        order: 0,
      })
      await seedState(project.id, {
        name: 'Todo',
        group: 'UNSTARTED',
        order: 0,
      })
      await seedState(project.id, {
        name: 'Backlog',
        group: 'BACKLOG',
        order: 0,
      })

      const result = await StateRepository.listByProject(project.id)

      const states = expectOk(result)
      expect(states.map((s) => s.group)).toEqual([
        'BACKLOG',
        'UNSTARTED',
        'COMPLETED',
      ])
    })
  })

  describe('countByGroup()', () => {
    it('should count states in a group', async () => {
      const project = await setupProject()
      await seedState(project.id, { group: 'STARTED' })
      await seedState(project.id, { group: 'STARTED' })

      const result = await StateRepository.countByGroup(project.id, 'STARTED')

      expect(expectOk(result)).toBe(2)
    })
  })

  describe('create()', () => {
    it('should persist a new state', async () => {
      const project = await setupProject()

      const result = await StateRepository.create({
        name: 'Custom',
        group: 'STARTED',
        projectId: project.id,
      })

      const state = expectOk(result)
      expect(state.name).toBe('Custom')
      expect(state.color).toBe('ZINC')
    })
  })

  describe('update()', () => {
    it('should update state fields', async () => {
      const project = await setupProject()
      const seeded = await seedState(project.id)

      const result = await StateRepository.update(seeded.id, {
        name: 'Renamed',
      })

      expect(expectOk(result).name).toBe('Renamed')
    })
  })

  describe('delete()', () => {
    it('should remove the state', async () => {
      const project = await setupProject()
      const seeded = await seedState(project.id)

      await StateRepository.delete(seeded.id)

      const result = await StateRepository.findById(seeded.id)
      expectErr(result, 'STATE_NOT_FOUND')
    })
  })

  describe('setDefault()', () => {
    it('should unset the previous default and set the new one', async () => {
      const project = await setupProject()
      const oldDefault = await seedState(project.id, {
        group: 'UNSTARTED',
        isDefault: true,
      })
      const newDefault = await seedState(project.id, { group: 'STARTED' })

      const result = await StateRepository.setDefault(newDefault.id, project.id)

      expect(expectOk(result).isDefault).toBe(true)
      const previous = expectOk(await StateRepository.findById(oldDefault.id))
      expect(previous.isDefault).toBe(false)
    })
  })
})
