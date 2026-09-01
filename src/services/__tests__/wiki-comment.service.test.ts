import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeWikiComment } from '@/src/__tests__/factories/wiki-comment.factory'
import { createFakeWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WikiCommentRepository } from '@/src/repositories/wiki-comment.repository'
import { WikiPageRepository } from '@/src/repositories/wiki-page.repository'
import { WikiCommentService } from '../wiki-comment.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/wiki-page.repository')
vi.mock('@/src/repositories/wiki-comment.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedWikiPage = vi.mocked(WikiPageRepository)
const mockedWikiComment = vi.mocked(WikiCommentRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})
const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})

function withAuthor(
  overrides?: Partial<ReturnType<typeof createFakeWikiComment>>,
) {
  return {
    ...createFakeWikiComment({ wikiPageId: 'page-1', ...overrides }),
    author: { id: 'actor', name: 'Ana', username: 'ana', image: null },
  }
}

function inPage(membership = memberMembership) {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(membership))
  mockedWikiPage.findById.mockResolvedValue(
    ok(createFakeWikiPage({ id: 'page-1', workspaceId: 'ws1' })),
  )
}

describe('WikiCommentService', () => {
  describe('list()', () => {
    it('should list comments for a workspace member', async () => {
      inPage()
      mockedWikiComment.listByWikiPage.mockResolvedValue(ok([withAuthor()]))

      const result = await WikiCommentService.list('actor', 'ws1', 'page-1')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WikiCommentService.list('stranger', 'ws1', 'page-1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedWikiComment.listByWikiPage).not.toHaveBeenCalled()
    })

    it('should return WIKI_PAGE_FORBIDDEN when the page belongs to another workspace', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'page-1', workspaceId: 'ws2' })),
      )

      const result = await WikiCommentService.list('actor', 'ws1', 'page-1')

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a root comment for a workspace member', async () => {
      inPage()
      const created = withAuthor({ id: 'c1', markId: 'mark1' })
      mockedWikiComment.create.mockResolvedValue(ok(created))

      const result = await WikiCommentService.create('actor', 'ws1', 'page-1', {
        markId: 'mark1',
        content: [{ type: 'p', children: [{ text: 'Oi' }] }],
      })

      expect(expectOk(result).markId).toBe('mark1')
      expect(mockedWikiComment.create).toHaveBeenCalledWith({
        wikiPageId: 'page-1',
        authorId: 'actor',
        markId: 'mark1',
        content: [{ type: 'p', children: [{ text: 'Oi' }] }],
        parentId: undefined,
      })
    })

    it('should force a reply to join its parent markId, ignoring the payload one', async () => {
      inPage()
      const parent = withAuthor({ id: 'p1', markId: 'mark1', parentId: null })
      mockedWikiComment.findById.mockResolvedValue(ok(parent))
      mockedWikiComment.create.mockResolvedValue(
        ok(withAuthor({ id: 'r1', markId: 'mark1', parentId: 'p1' })),
      )

      await WikiCommentService.create('actor', 'ws1', 'page-1', {
        markId: 'someone-elses-mark',
        content: [{ type: 'p', children: [{ text: 'Resposta' }] }],
        parentId: 'p1',
      })

      expect(mockedWikiComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ markId: 'mark1', parentId: 'p1' }),
      )
    })

    it('should reject replying to a reply', async () => {
      inPage()
      const reply = withAuthor({ id: 'r1', parentId: 'root-1' })
      mockedWikiComment.findById.mockResolvedValue(ok(reply))

      const result = await WikiCommentService.create('actor', 'ws1', 'page-1', {
        markId: 'mark1',
        content: [],
        parentId: 'r1',
      })

      expectErr(result, 'WIKI_COMMENT_NESTING_TOO_DEEP')
      expect(mockedWikiComment.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      inPage()
      mockedWikiComment.create.mockResolvedValue(err(databaseError()))

      const result = await WikiCommentService.create('actor', 'ws1', 'page-1', {
        markId: 'mark1',
        content: [],
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should let the author edit their own comment', async () => {
      inPage()
      const existing = withAuthor({ id: 'c1', authorId: 'actor' })
      mockedWikiComment.findById.mockResolvedValue(ok(existing))
      mockedWikiComment.update.mockResolvedValue(ok(existing))

      const result = await WikiCommentService.update(
        'actor',
        'ws1',
        'page-1',
        'c1',
        { content: [{ type: 'p', children: [{ text: 'Editado' }] }] },
      )

      expectOk(result)
    })

    it('should reject editing someone else comment', async () => {
      inPage()
      const existing = withAuthor({ id: 'c1', authorId: 'other-user' })
      mockedWikiComment.findById.mockResolvedValue(ok(existing))

      const result = await WikiCommentService.update(
        'actor',
        'ws1',
        'page-1',
        'c1',
        { content: [] },
      )

      expectErr(result, 'WIKI_COMMENT_FORBIDDEN')
      expect(mockedWikiComment.update).not.toHaveBeenCalled()
    })
  })

  describe('resolve()', () => {
    it('should let any workspace member resolve a root comment', async () => {
      inPage()
      const root = withAuthor({
        id: 'c1',
        authorId: 'other-user',
        parentId: null,
      })
      mockedWikiComment.findById.mockResolvedValue(ok(root))
      mockedWikiComment.resolve.mockResolvedValue(
        ok({ ...root, resolved: true, resolvedById: 'actor' }),
      )

      const result = await WikiCommentService.resolve(
        'actor',
        'ws1',
        'page-1',
        'c1',
        { resolved: true },
      )

      expect(expectOk(result).resolved).toBe(true)
      expect(mockedWikiComment.resolve).toHaveBeenCalledWith('c1', {
        resolved: true,
        resolvedById: 'actor',
      })
    })

    it('should reject resolving a reply directly', async () => {
      inPage()
      const reply = withAuthor({ id: 'r1', parentId: 'root-1' })
      mockedWikiComment.findById.mockResolvedValue(ok(reply))

      const result = await WikiCommentService.resolve(
        'actor',
        'ws1',
        'page-1',
        'r1',
        { resolved: true },
      )

      expectErr(result, 'WIKI_COMMENT_FORBIDDEN')
      expect(mockedWikiComment.resolve).not.toHaveBeenCalled()
    })
  })

  describe('delete()', () => {
    it('should let the author delete their own comment', async () => {
      inPage()
      const existing = withAuthor({ id: 'c1', authorId: 'actor' })
      mockedWikiComment.findById.mockResolvedValue(ok(existing))
      mockedWikiComment.delete.mockResolvedValue(ok(undefined))

      const result = await WikiCommentService.delete(
        'actor',
        'ws1',
        'page-1',
        'c1',
      )

      expectOk(result)
    })

    it('should let a privileged member delete someone else comment', async () => {
      inPage(ownerMembership)
      const existing = withAuthor({ id: 'c1', authorId: 'other-user' })
      mockedWikiComment.findById.mockResolvedValue(ok(existing))
      mockedWikiComment.delete.mockResolvedValue(ok(undefined))

      const result = await WikiCommentService.delete(
        'actor',
        'ws1',
        'page-1',
        'c1',
      )

      expectOk(result)
    })

    it('should reject a regular member deleting someone else comment', async () => {
      inPage()
      const existing = withAuthor({ id: 'c1', authorId: 'other-user' })
      mockedWikiComment.findById.mockResolvedValue(ok(existing))

      const result = await WikiCommentService.delete(
        'actor',
        'ws1',
        'page-1',
        'c1',
      )

      expectErr(result, 'WIKI_COMMENT_FORBIDDEN')
      expect(mockedWikiComment.delete).not.toHaveBeenCalled()
    })
  })
})
