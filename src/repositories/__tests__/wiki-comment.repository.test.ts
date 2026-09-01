import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWikiComment } from '@/src/__tests__/factories/wiki-comment.factory'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { WikiCommentRepository } from '../wiki-comment.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupWikiPage() {
  const workspace = await seedWorkspace()
  const author = await seedUser()
  const page = await seedWikiPage(workspace.id, author.id)
  return { page, author }
}

describe('WikiCommentRepository', () => {
  describe('findById()', () => {
    it('should return the comment when it exists', async () => {
      const { page, author } = await setupWikiPage()
      const seeded = await seedWikiComment(page.id, author.id)

      const result = await WikiCommentRepository.findById(seeded.id)

      expect(expectOk(result).id).toBe(seeded.id)
    })

    it('should return WIKI_COMMENT_NOT_FOUND when it does not exist', async () => {
      const result = await WikiCommentRepository.findById('nonexistent')
      expectErr(result, 'WIKI_COMMENT_NOT_FOUND')
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.wikiComment, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await WikiCommentRepository.findById('x'), 'DATABASE_ERROR')
    })
  })

  describe('create()', () => {
    it('should create a root comment with author data', async () => {
      const { page, author } = await setupWikiPage()

      const result = await WikiCommentRepository.create({
        wikiPageId: page.id,
        authorId: author.id,
        markId: 'mark1',
        content: [{ type: 'p', children: [{ text: 'Oi' }] }],
      })

      const comment = expectOk(result)
      expect(comment.wikiPageId).toBe(page.id)
      expect(comment.markId).toBe('mark1')
      expect(comment.author.id).toBe(author.id)
      expect(comment.parentId).toBeNull()
      expect(comment.resolved).toBe(false)
    })

    it('should create a reply pointing at the parent, sharing its markId', async () => {
      const { page, author } = await setupWikiPage()
      const parent = await seedWikiComment(page.id, author.id, {
        markId: 'mark1',
      })

      const result = await WikiCommentRepository.create({
        wikiPageId: page.id,
        authorId: author.id,
        markId: 'mark1',
        content: [{ type: 'p', children: [{ text: 'Resposta' }] }],
        parentId: parent.id,
      })

      expect(expectOk(result).parentId).toBe(parent.id)
    })
  })

  describe('listByWikiPage()', () => {
    it('should list comments ordered by markId then creation, replies included', async () => {
      const { page, author } = await setupWikiPage()
      const rootA = await seedWikiComment(page.id, author.id, {
        markId: 'markA',
      })
      const replyA = await seedWikiComment(page.id, author.id, {
        markId: 'markA',
        parentId: rootA.id,
      })
      const rootB = await seedWikiComment(page.id, author.id, {
        markId: 'markB',
      })

      const result = await WikiCommentRepository.listByWikiPage(page.id)

      expect(expectOk(result).map((c) => c.id)).toEqual([
        rootA.id,
        replyA.id,
        rootB.id,
      ])
    })
  })

  describe('update()', () => {
    it('should replace the content', async () => {
      const { page, author } = await setupWikiPage()
      const comment = await seedWikiComment(page.id, author.id)

      const result = await WikiCommentRepository.update(comment.id, [
        { type: 'p', children: [{ text: 'Editado' }] },
      ])

      expect(expectOk(result).content).toEqual([
        { type: 'p', children: [{ text: 'Editado' }] },
      ])
    })

    it('should return WIKI_COMMENT_NOT_FOUND for a missing id', async () => {
      const result = await WikiCommentRepository.update('nonexistent', [])
      expectErr(result, 'WIKI_COMMENT_NOT_FOUND')
    })
  })

  describe('resolve()', () => {
    it('should stamp resolvedAt and resolvedById when resolving', async () => {
      const { page, author } = await setupWikiPage()
      const comment = await seedWikiComment(page.id, author.id)

      const result = await WikiCommentRepository.resolve(comment.id, {
        resolved: true,
        resolvedById: author.id,
      })

      const resolved = expectOk(result)
      expect(resolved.resolved).toBe(true)
      expect(resolved.resolvedAt).not.toBeNull()
      expect(resolved.resolvedById).toBe(author.id)
    })

    it('should clear resolvedAt and resolvedById when unresolving', async () => {
      const { page, author } = await setupWikiPage()
      const comment = await seedWikiComment(page.id, author.id, {
        resolved: true,
        resolvedAt: new Date(),
        resolvedById: author.id,
      })

      const result = await WikiCommentRepository.resolve(comment.id, {
        resolved: false,
        resolvedById: null,
      })

      const unresolved = expectOk(result)
      expect(unresolved.resolved).toBe(false)
      expect(unresolved.resolvedAt).toBeNull()
      expect(unresolved.resolvedById).toBeNull()
    })
  })

  describe('delete()', () => {
    it('should remove the comment and cascade to its replies', async () => {
      const { page, author } = await setupWikiPage()
      const parent = await seedWikiComment(page.id, author.id)
      const reply = await seedWikiComment(page.id, author.id, {
        parentId: parent.id,
      })

      await WikiCommentRepository.delete(parent.id)

      expectErr(
        await WikiCommentRepository.findById(parent.id),
        'WIKI_COMMENT_NOT_FOUND',
      )
      expectErr(
        await WikiCommentRepository.findById(reply.id),
        'WIKI_COMMENT_NOT_FOUND',
      )
    })

    it('should return WIKI_COMMENT_NOT_FOUND for a missing id', async () => {
      const result = await WikiCommentRepository.delete('nonexistent')
      expectErr(result, 'WIKI_COMMENT_NOT_FOUND')
    })
  })
})
