import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedLabel } from '@/src/__tests__/factories/label.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { LabelRepository } from '../label.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupProject() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  return seedProject(ws.id, user.id)
}

describe('LabelRepository', () => {
  describe('findById()', () => {
    it('should return label when it exists', async () => {
      const project = await setupProject()
      const seeded = await seedLabel(project.id, { name: 'Bug' })

      const result = await LabelRepository.findById(seeded.id)

      expect(expectOk(result).name).toBe('Bug')
    })

    it('should return LABEL_NOT_FOUND when label does not exist', async () => {
      const result = await LabelRepository.findById('nonexistent')
      expectErr(result, 'LABEL_NOT_FOUND')
    })
  })

  describe('listByProject()', () => {
    it('should list labels for a project', async () => {
      const project = await setupProject()
      await seedLabel(project.id, { name: 'Design' })
      await seedLabel(project.id, { name: 'Code' })

      const result = await LabelRepository.listByProject(project.id)

      expect(expectOk(result)).toHaveLength(2)
    })
  })

  describe('create()', () => {
    it('should persist a new label', async () => {
      const project = await setupProject()

      const result = await LabelRepository.create({
        name: 'Bug',
        projectId: project.id,
      })

      const label = expectOk(result)
      expect(label.name).toBe('Bug')
      expect(label.color).toBe('ZINC')
    })

    it('should return DATABASE_ERROR for a nonexistent project id', async () => {
      const result = await LabelRepository.create({
        name: 'Orphan',
        projectId: 'nonexistent',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update label fields', async () => {
      const project = await setupProject()
      const seeded = await seedLabel(project.id)

      const result = await LabelRepository.update(seeded.id, {
        name: 'Renamed',
      })

      expect(expectOk(result).name).toBe('Renamed')
    })

    it('should return DATABASE_ERROR for a nonexistent id', async () => {
      const result = await LabelRepository.update('nonexistent', {
        name: 'Renamed',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should remove the label', async () => {
      const project = await setupProject()
      const seeded = await seedLabel(project.id)

      await LabelRepository.delete(seeded.id)

      const result = await LabelRepository.findById(seeded.id)
      expectErr(result, 'LABEL_NOT_FOUND')
    })

    it('should return DATABASE_ERROR for a nonexistent id', async () => {
      const result = await LabelRepository.delete('nonexistent')
      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
