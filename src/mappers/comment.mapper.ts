import type { JSONContent } from '@tiptap/react'
import type { CommentDTO } from '@/types/comment'
import type { CommentWithAuthor } from '../repositories/comment.repository'

export function toCommentDTO(comment: CommentWithAuthor): CommentDTO {
  return {
    id: comment.id,
    content: (comment.content as JSONContent) ?? { type: 'doc', content: [] },
    issueId: comment.issueId,
    parentId: comment.parentId ?? null,
    author: comment.author,
    editedAt: comment.editedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }
}
