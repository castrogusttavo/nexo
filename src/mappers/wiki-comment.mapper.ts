import type { Value } from 'platejs'
import type { WikiCommentDTO } from '@/types/wiki-comment'
import type { WikiCommentWithAuthor } from '../repositories/wiki-comment.repository'
import { withTimestamps } from './_shared'

export function toWikiCommentDTO(
  comment: WikiCommentWithAuthor,
): WikiCommentDTO {
  return {
    id: comment.id,
    wikiPageId: comment.wikiPageId,
    markId: comment.markId,
    parentId: comment.parentId ?? null,
    content: comment.content as Value,
    author: comment.author,
    resolved: comment.resolved,
    resolvedAt: comment.resolvedAt?.toISOString() ?? null,
    resolvedById: comment.resolvedById ?? null,
    ...withTimestamps(comment),
  }
}
