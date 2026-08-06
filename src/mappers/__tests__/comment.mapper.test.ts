import { describe, expect, it } from 'vitest'
import { createFakeComment } from '@/src/__tests__/factories/comment.factory'
import type { CommentWithAuthor } from '@/src/repositories/comment.repository'
import { toCommentDTO } from '../comment.mapper'

function withAuthor(overrides?: Partial<CommentWithAuthor>): CommentWithAuthor {
  return {
    ...createFakeComment(),
    author: {
      id: 'user-1',
      name: 'Ana',
      username: 'ana',
      image: null,
    },
    ...overrides,
  }
}

describe('toCommentDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2026-03-01T10:00:00.000Z')
    const edited = new Date('2026-03-02T10:00:00.000Z')
    const comment = withAuthor({
      id: 'comment-1',
      content: { type: 'doc', content: [] },
      issueId: 'issue-1',
      parentId: 'parent-1',
      editedAt: edited,
      createdAt: now,
      updatedAt: now,
    })

    expect(toCommentDTO(comment)).toEqual({
      id: 'comment-1',
      content: { type: 'doc', content: [] },
      issueId: 'issue-1',
      parentId: 'parent-1',
      author: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
      editedAt: '2026-03-02T10:00:00.000Z',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    })
  })

  it('should map a never-edited comment with null editedAt', () => {
    const comment = withAuthor({ editedAt: null })

    expect(toCommentDTO(comment).editedAt).toBeNull()
  })

  it('should map a root comment with null parentId', () => {
    const comment = withAuthor({ parentId: null })

    expect(toCommentDTO(comment).parentId).toBeNull()
  })
})
