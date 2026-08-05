import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedComment } from '@/src/__tests__/factories/comment.factory'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { CommentRepository } from '../comment.repository'

afterEach(() => {
  vi.resetAllMocks()
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

describe('CommentRepository', () => {
  describe('create()', () => {
    it('should create the comment with author data', async () => {
      const { issue, author } = await setupIssue()

      const result = await CommentRepository.create({
        content: { type: 'doc', content: [] },
        issueId: issue.id,
        authorId: author.id,
      })

      expect(expectOk(result).issueId).toBe(issue.id)
      expect(expectOk(result).author.id).toBe(author.id)
      expect(expectOk(result).parentId).toBeNull()
      expect(expectOk(result).editedAt).toBeNull()
    })

    it('should create a reply pointing at the parent', async () => {
      const { issue, author } = await setupIssue()
      const parent = await seedComment(issue.id, author.id)

      const result = await CommentRepository.create({
        content: { type: 'doc', content: [] },
        issueId: issue.id,
        authorId: author.id,
        parentId: parent.id,
      })

      expect(expectOk(result).parentId).toBe(parent.id)
    })

    it('should return DATABASE_ERROR for a nonexistent issue', async () => {
      const { author } = await setupIssue()

      const result = await CommentRepository.create({
        content: { type: 'doc', content: [] },
        issueId: 'nonexistent',
        authorId: author.id,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listByIssue()', () => {
    it('should list comments ordered by creation, replies included', async () => {
      const { issue, author } = await setupIssue()
      const first = await seedComment(issue.id, author.id)
      const reply = await seedComment(issue.id, author.id, {
        parentId: first.id,
      })

      const result = await CommentRepository.listByIssue(issue.id)

      expect(expectOk(result).map((c) => c.id)).toEqual([first.id, reply.id])
    })
  })

  describe('update()', () => {
    it('should replace the content and stamp editedAt', async () => {
      const { issue, author } = await setupIssue()
      const comment = await seedComment(issue.id, author.id)

      const result = await CommentRepository.update(comment.id, {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      })

      expect(expectOk(result).editedAt).not.toBeNull()
    })

    it('should return COMMENT_NOT_FOUND for a missing id', async () => {
      const result = await CommentRepository.update('nonexistent', {
        type: 'doc',
        content: [],
      })

      expectErr(result, 'COMMENT_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should remove the comment and cascade to its replies', async () => {
      const { issue, author } = await setupIssue()
      const parent = await seedComment(issue.id, author.id)
      const reply = await seedComment(issue.id, author.id, {
        parentId: parent.id,
      })

      await CommentRepository.delete(parent.id)

      expectErr(
        await CommentRepository.findById(parent.id),
        'COMMENT_NOT_FOUND',
      )
      expectErr(await CommentRepository.findById(reply.id), 'COMMENT_NOT_FOUND')
    })

    it('should return COMMENT_NOT_FOUND for a missing id', async () => {
      const result = await CommentRepository.delete('nonexistent')
      expectErr(result, 'COMMENT_NOT_FOUND')
    })
  })

  describe('findById()', () => {
    it('should return COMMENT_NOT_FOUND for a missing id', async () => {
      const result = await CommentRepository.delete('nonexistent')
      expectErr(result, 'COMMENT_NOT_FOUND')
    })
  })
})
