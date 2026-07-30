import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { IssueTypeRepository } from '@/src/repositories/issue-type.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupProject() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  return seedProject(ws.id, user.id)
}

describe('IssueTypeRepository', () => {
  describe('findById()', () => {
    it('should return the issue type', async () => {
      const project = await setupProject()
      const created = expectOk(
        await IssueTypeRepository.create({
          name: 'Bug',
          icon: 'bug-icon',
          projectId: project.id,
        }),
      )

      const result = await IssueTypeRepository.findById(created.id)

      expect(expectOk(result).id).toBe(created.id)
    })

    it('should return ISSUE_TYPE_NOT_FOUND for a missing id', async () => {
      const result = await IssueTypeRepository.findById('nonexistent')
      expectErr(result, 'ISSUE_TYPE_NOT_FOUND')
    })
  })

  describe('listByProject()', () => {
    it('should list types ordered ascending', async () => {
      const project = await setupProject()

      const first = expectOk(
        await IssueTypeRepository.create({
          name: 'Task',
          icon: 'task-icon',
          projectId: project.id,
        }),
      )
      const second = expectOk(
        await IssueTypeRepository.create({
          name: 'Epic',
          icon: 'epic-icon',
          projectId: project.id,
        }),
      )

      const result = await IssueTypeRepository.listByProject(project.id)

      expect(expectOk(result).map((t) => t.id)).toEqual([first.id, second.id])
    })
  })

  describe('create()', () => {
    it('should append a type with the next order', async () => {
      const project = await setupProject()

      const first = expectOk(
        await IssueTypeRepository.create({
          name: 'Task',
          icon: 'task-icon',
          projectId: project.id,
        }),
      )
      const second = expectOk(
        await IssueTypeRepository.create({
          name: 'Epic',
          icon: 'epic-icon',
          projectId: project.id,
        }),
      )

      expect(first.order).toBe(0)
      expect(second.order).toBe(1)
    })

    it('should default isSystem to false', async () => {
      const project = await setupProject()

      const created = expectOk(
        await IssueTypeRepository.create({
          name: 'Task',
          icon: 'task-icon',
          projectId: project.id,
        }),
      )

      expect(created.isSystem).toBe(false)
    })

    it('should return DATABASE_ERROR for a nonexistent project id', async () => {
      const result = await IssueTypeRepository.create({
        name: 'Bug',
        icon: 'bug-icon',
        projectId: 'nonexistent',
      })
      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update the type fields', async () => {
      const project = await setupProject()

      const created = expectOk(
        await IssueTypeRepository.create({
          name: 'Bug',
          icon: 'bug-icon',
          projectId: project.id,
        }),
      )

      const result = await IssueTypeRepository.update(created.id, {
        name: 'Defect',
      })

      expect(expectOk(result).name).toBe('Defect')
    })

    it('should return ISSUE_TYPE_NOT_FOUND for a missing id', async () => {
      const result = await IssueTypeRepository.update('nonexistent', {
        name: 'Defect',
      })

      expectErr(result, 'ISSUE_TYPE_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should remove the type', async () => {
      const project = await setupProject()

      const created = expectOk(
        await IssueTypeRepository.create({
          name: 'Bug',
          icon: 'bug-icon',
          projectId: project.id,
        }),
      )

      await IssueTypeRepository.delete(created.id)

      const found = await IssueTypeRepository.findById(created.id)
      expectErr(found, 'ISSUE_TYPE_NOT_FOUND')
    })

    it('should return ISSUE_TYPE_NOT_FOUND for a missing id', async () => {
      const result = await IssueTypeRepository.delete('nonexistent')

      expectErr(result, 'ISSUE_TYPE_NOT_FOUND')
    })
  })

  describe('reorder()', () => {
    it('should persist the new order matching the given id sequence', async () => {
      const project = await setupProject()
      const a = expectOk(
        await IssueTypeRepository.create({
          name: 'A',
          icon: 'a-icon',
          projectId: project.id,
        }),
      )

      const b = expectOk(
        await IssueTypeRepository.create({
          name: 'B',
          icon: 'b-icon',
          projectId: project.id,
        }),
      )

      const result = await IssueTypeRepository.reorder(project.id, [b.id, a.id])

      const types = expectOk(result)
      expect(types.map((t) => t.id)).toEqual([b.id, a.id])
      expect(types.map((t) => t.order)).toEqual([0, 1])
    })

    it('should return DATABASE_ERROR when a type id does not exist', async () => {
      const project = await setupProject()
      const a = expectOk(
        await IssueTypeRepository.create({
          name: 'A',
          icon: 'a-icon',
          projectId: project.id,
        }),
      )

      const result = await IssueTypeRepository.reorder(project.id, [
        a.id,
        'nonexistent',
      ])

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
