import { describe, expect, it } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import {
  seedProject,
  seedProjectMember,
} from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ProjectDocumentRepository } from '../project-document.repository'

async function setup() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, user.id)
  return { user, ws, project }
}

describe('ProjectDocumentRepository', () => {
  describe('findAccessById()', () => {
    it('should return the access fields and member ids', async () => {
      const { user, ws, project } = await setup()
      await seedProjectMember({ projectId: project.id, userId: user.id })

      const result = expectOk(
        await ProjectDocumentRepository.findAccessById(project.id),
      )

      expect(result.workspaceId).toBe(ws.id)
      expect(result.leadId).toBe(user.id)
      expect(result.document).toEqual([])
      expect(result.documentYjsState).toBeNull()
      expect(result.members.map((m) => m.userId)).toContain(user.id)
    })

    it('should return PROJECT_NOT_FOUND for an unknown id', async () => {
      const result = await ProjectDocumentRepository.findAccessById('nope')

      expect(expectErr(result).code).toBe('PROJECT_NOT_FOUND')
    })
  })

  describe('updateContent()', () => {
    it('should persist the snapshot and stamp documentUpdatedAt', async () => {
      const { project } = await setup()
      const content = [{ type: 'p', children: [{ text: 'olá' }] }]

      const saved = expectOk(
        await ProjectDocumentRepository.updateContent(project.id, content),
      )

      expect(saved.document).toEqual(content)
      expect(saved.documentUpdatedAt).toBeInstanceOf(Date)
    })

    it('should return a database error for an unknown id', async () => {
      const result = await ProjectDocumentRepository.updateContent('nope', [])

      expect(expectErr(result).code).toBe('DATABASE_ERROR')
    })
  })

  describe('updateYjsState()', () => {
    it('should round-trip the binary state', async () => {
      const { project } = await setup()

      expectOk(
        await ProjectDocumentRepository.updateYjsState(
          project.id,
          new Uint8Array([1, 2, 3, 4]),
        ),
      )
      const found = expectOk(
        await ProjectDocumentRepository.findAccessById(project.id),
      )

      expect(Array.from(found.documentYjsState ?? [])).toEqual([1, 2, 3, 4])
    })

    it('should leave the JSON snapshot untouched', async () => {
      const { project } = await setup()
      const content = [{ type: 'p', children: [{ text: 'fica' }] }]
      expectOk(
        await ProjectDocumentRepository.updateContent(project.id, content),
      )

      expectOk(
        await ProjectDocumentRepository.updateYjsState(
          project.id,
          new Uint8Array([9]),
        ),
      )
      const found = expectOk(
        await ProjectDocumentRepository.findAccessById(project.id),
      )

      expect(found.document).toEqual(content)
    })
  })
})
