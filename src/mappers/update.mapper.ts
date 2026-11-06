import type {
  UpdateAuthorDTO,
  UpdateDTO,
  UpdateReactionSummaryDTO,
  UpdateReplyDTO,
} from '@/types/updates'
import type {
  UpdateAuthor,
  UpdateWithDetails,
} from '../repositories/update.repository'
import type { UpdateRpelyWithAuthor } from '../repositories/update-reply.repository'

function toAuthorDTO(author: UpdateAuthor | null): UpdateAuthorDTO | null {
  if (!author) return null
  const { id, name, username, image } = author
  return { id, name, username, image }
}

function summarize(
  rows: { emoji: string; userId: string }[],
  viewerId: string,
): UpdateReactionSummaryDTO[] {
  const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>()
  for (const { emoji, userId } of rows) {
    const entry = byEmoji.get(emoji) ?? { count: 0, reactedByMe: false }
    entry.count += 1
    if (userId === viewerId) entry.reactedByMe = true
    byEmoji.set(emoji, entry)
  }
  return [...byEmoji]
    .map(([emoji, entry]) => ({ emoji, ...entry }))
    .sort((a, b) => b.count - a.count)
}

export function toUpdateDTO(
  update: UpdateWithDetails,
  viewerId: string,
): UpdateDTO {
  return {
    id: update.id,
    projectId: update.projectId,
    issueId: update.issueId,
    status: update.status,
    content: update.content,
    author: toAuthorDTO(update.author),
    editedAt: update.editedAt?.toISOString() ?? null,
    createdAt: update.createdAt.toISOString(),
    replyCount: update._count.replies,
    reactions: summarize(update.reactions, viewerId),
  }
}

export function toUpdateReplyDTO(reply: UpdateRpelyWithAuthor): UpdateReplyDTO {
  return {
    id: reply.id,
    updateId: reply.updateId,
    content: reply.content,
    author: toAuthorDTO(reply.author),
    editedAt: reply.editedAt?.toISOString() ?? null,
    createdAt: reply.createdAt.toISOString(),
  }
}
