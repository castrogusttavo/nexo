import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  assignProjectLabels,
  seedProjectLabel,
} from '@/src/__tests__/factories/project-label.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { ProjectLabelRepository } from '../project-label.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectLabelRepository', () => {
  describe('findById()', () => {
    it('should return the label when it exists', async () => {
      const ws = await seedWorkspace()
      const seeded = await seedProjectLabel(ws.id, { name: 'Marketing' })

      const label = expectOk(await ProjectLabelRepository.findById(seeded.id))

      expect(label.name).toBe('Marketing')
    })

    it('should return PROJECT_LABEL_NOT_FOUND when it does not exist', async () => {
      const result = await ProjectLabelRepository.findById('nonexistent')

      expectErr(result, 'PROJECT_LABEL_NOT_FOUND')
    })
  })

  describe('listByWorkspace()', () => {
    it('should list the workspace labels alphabetically', async () => {
      const ws = await seedWorkspace()
      await seedProjectLabel(ws.id, { name: 'Vendas' })
      await seedProjectLabel(ws.id, { name: 'Marketing' })
      await seedProjectLabel(ws.id, { name: 'Engenharia' })

      const labels = expectOk(
        await ProjectLabelRepository.listByWorkspace(ws.id),
      )

      expect(labels.map((l) => l.name)).toEqual([
        'Engenharia',
        'Marketing',
        'Vendas',
      ])
    })

    it('should list only the labels of that workspace', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      await seedProjectLabel(ws.id, { name: 'Nossa' })
      await seedProjectLabel(other.id, { name: 'Deles' })

      const labels = expectOk(
        await ProjectLabelRepository.listByWorkspace(ws.id),
      )

      expect(labels.map((l) => l.name)).toEqual(['Nossa'])
    })
  })

  describe('countInWorkspace()', () => {
    it('should count only the ids that belong to the workspace', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      const a = await seedProjectLabel(ws.id)
      const b = await seedProjectLabel(ws.id)
      const foreign = await seedProjectLabel(other.id)

      const count = expectOk(
        await ProjectLabelRepository.countInWorkspace(ws.id, [
          a.id,
          b.id,
          foreign.id,
          'nonexistent',
        ]),
      )

      expect(count).toBe(2)
    })

    it('should count zero for an empty list', async () => {
      const ws = await seedWorkspace()

      expect(
        expectOk(await ProjectLabelRepository.countInWorkspace(ws.id, [])),
      ).toBe(0)
    })
  })

  describe('create()', () => {
    it('should persist a label in the workspace', async () => {
      const ws = await seedWorkspace()

      const label = expectOk(
        await ProjectLabelRepository.create({
          workspaceId: ws.id,
          name: 'Marketing',
          color: 'YELLOW',
        }),
      )

      expect(label).toMatchObject({
        name: 'Marketing',
        color: 'YELLOW',
        workspaceId: ws.id,
      })
    })

    it('should return PROJECT_LABEL_ALREADY_EXISTS for a name taken in the workspace', async () => {
      const ws = await seedWorkspace()
      await seedProjectLabel(ws.id, { name: 'Marketing' })

      const result = await ProjectLabelRepository.create({
        workspaceId: ws.id,
        name: 'Marketing',
        color: 'ZINC',
      })

      expectErr(result, 'PROJECT_LABEL_ALREADY_EXISTS')
    })

    it('should accept a name another workspace already uses', async () => {
      const ws = await seedWorkspace()
      const other = await seedWorkspace()
      await seedProjectLabel(other.id, { name: 'Marketing' })

      const result = await ProjectLabelRepository.create({
        workspaceId: ws.id,
        name: 'Marketing',
        color: 'ZINC',
      })

      expectOk(result)
    })
  })

  describe('update()', () => {
    it('should update the given fields', async () => {
      const ws = await seedWorkspace()
      const seeded = await seedProjectLabel(ws.id, { name: 'Antiga' })

      const label = expectOk(
        await ProjectLabelRepository.update(seeded.id, {
          name: 'Nova',
          color: 'GREEN',
        }),
      )

      expect(label).toMatchObject({ name: 'Nova', color: 'GREEN' })
    })

    it('should return PROJECT_LABEL_ALREADY_EXISTS when renaming onto a taken name', async () => {
      const ws = await seedWorkspace()
      await seedProjectLabel(ws.id, { name: 'Ocupada' })
      const seeded = await seedProjectLabel(ws.id, { name: 'Livre' })

      const result = await ProjectLabelRepository.update(seeded.id, {
        name: 'Ocupada',
      })

      expectErr(result, 'PROJECT_LABEL_ALREADY_EXISTS')
    })

    it('should return DATABASE_ERROR for a nonexistent id', async () => {
      const result = await ProjectLabelRepository.update('nonexistent', {
        name: 'Nova',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should remove the label from every project that carried it', async () => {
      const lead = await seedUser()
      const ws = await seedWorkspace()
      const doomed = await seedProjectLabel(ws.id)
      const kept = await seedProjectLabel(ws.id)
      const project = await seedProject(ws.id, lead.id)
      await assignProjectLabels(project.id, [doomed.id, kept.id])

      expectOk(await ProjectLabelRepository.delete(doomed.id))

      const left = await prisma.projectLabelAssignment.findMany({
        where: { projectId: project.id },
      })
      expect(left.map((a) => a.labelId)).toEqual([kept.id])
    })

    it('should return DATABASE_ERROR for a nonexistent id', async () => {
      const result = await ProjectLabelRepository.delete('nonexistent')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
