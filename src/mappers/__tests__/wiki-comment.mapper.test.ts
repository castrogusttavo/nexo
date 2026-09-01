import { describe, expect, it } from 'vitest'
import { createFakeWikiComment } from '@/src/__tests__/factories/wiki-comment.factory'
import type { WikiCommentWithAuthor } from '@/src/repositories/wiki-comment.repository'
import { toWikiCommentDTO } from '../wiki-comment.mapper'

function withAuthor(
  overrides?: Partial<WikiCommentWithAuthor>,
): WikiCommentWithAuthor {
  return {
    ...createFakeWikiComment(),
    author: {
      id: 'user-1',
      name: 'Ana',
      username: 'ana',
      image: null,
    },
    ...overrides,
  }
}

describe('toWikiCommentDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2026-03-01T10:00:00.000Z')
    const resolvedAt = new Date('2026-03-02T10:00:00.000Z')
    const comment = withAuthor({
      id: 'comment-1',
      wikiPageId: 'page-1',
      markId: 'mark-1',
      parentId: 'parent-1',
      content: [{ type: 'p', children: [{ text: 'Oi' }] }],
      resolved: true,
      resolvedAt,
      resolvedById: 'user-2',
      createdAt: now,
      updatedAt: now,
    })

    expect(toWikiCommentDTO(comment)).toEqual({
      id: 'comment-1',
      wikiPageId: 'page-1',
      markId: 'mark-1',
      parentId: 'parent-1',
      content: [{ type: 'p', children: [{ text: 'Oi' }] }],
      author: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
      resolved: true,
      resolvedAt: '2026-03-02T10:00:00.000Z',
      resolvedById: 'user-2',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    })
  })

  it('should map an unresolved comment with null resolvedAt/resolvedById', () => {
    const comment = withAuthor({
      resolved: false,
      resolvedAt: null,
      resolvedById: null,
    })

    const dto = toWikiCommentDTO(comment)
    expect(dto.resolved).toBe(false)
    expect(dto.resolvedAt).toBeNull()
    expect(dto.resolvedById).toBeNull()
  })

  it('should map a root comment with null parentId', () => {
    const comment = withAuthor({ parentId: null })

    expect(toWikiCommentDTO(comment).parentId).toBeNull()
  })
})
