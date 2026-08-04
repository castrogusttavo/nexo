import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { AttachmentRepository } from '../attachment.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupIssue() {
  const author = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: author.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, author.id)
  const state = await seedState(project.id)
  const type = await seedIssueType(project.id)
  const issue = await seedIssue({
    stateId: state.id,
    typeId: type.id,
    authorId: author.id,
    projectId: project.id,
  })
  return { issue, author }
}

function attachmentInput(issueId: string, uploadedById: string) {
  return {
    fileName: 'diagram.png',
    contentType: 'image/png',
    size: 2048,
    bucket: 'issue-attachments',
    key: `${issueId}/abc123`,
    issueId,
    uploadedById,
  }
}

describe('AttachmentRepository', () => {
  describe('create()', () => {
    it('should create the attachment', async () => {
      const { issue, author } = await setupIssue()

      const result = await AttachmentRepository.create(
        attachmentInput(issue.id, author.id),
      )

      expect(expectOk(result).fileName).toBe('diagram.png')
      expect(expectOk(result).issueId).toBe(issue.id)
    })

    it('should return DATABASE_ERROR for a nonexistent issue', async () => {
      const { author } = await setupIssue()

      const result = await AttachmentRepository.create(
        attachmentInput('nonexistent', author.id),
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listByIssue()', () => {
    it('should list attachments ordered by creation', async () => {
      const { issue, author } = await setupIssue()
      const first = expectOk(
        await AttachmentRepository.create({
          ...attachmentInput(issue.id, author.id),
          key: `${issue.id}/first`,
        }),
      )
      const second = expectOk(
        await AttachmentRepository.create({
          ...attachmentInput(issue.id, author.id),
          key: `${issue.id}/second`,
        }),
      )

      const result = await AttachmentRepository.listByIssue(issue.id)

      expect(expectOk(result).map((a) => a.id)).toEqual([first.id, second.id])
    })
  })

  describe('delete()', () => {
    it('should remove the attachment', async () => {
      const { issue, author } = await setupIssue()
      const created = expectOk(
        await AttachmentRepository.create(attachmentInput(issue.id, author.id)),
      )

      await AttachmentRepository.delete(created.id)

      const found = await AttachmentRepository.findById(created.id)
      expectErr(found, 'ATTACHMENT_NOT_FOUND')
    })

    it('should return ATTACHMENT_NOT_FOUND for a missing id', async () => {
      const found = await AttachmentRepository.delete('nonexistent')
      expectErr(found, 'ATTACHMENT_NOT_FOUND')
    })
  })

  describe('findById()', () => {
    it('should return ATTACHMENT_NOT_FOUND for a missing id', async () => {
      const found = await AttachmentRepository.findById('nonexistent')
      expectErr(found, 'ATTACHMENT_NOT_FOUND')
    })
  })
})
