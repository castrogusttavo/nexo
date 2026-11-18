import type { ProjectAttachment, ProjectLink } from '@prisma/client'
import type { ProjectAttachmentDTO } from '@/types/project-attachment'
import type { ProjectLinkDTO } from '@/types/project-link'
import type { ProjectReactionSummaryDTO } from '@/types/project-reaction'

export function summarizeProjectReactions(
  rows: { emoji: string; userId: string }[],
  viewerId: string,
): ProjectReactionSummaryDTO[] {
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

export function toProjectLinkDTO(link: ProjectLink): ProjectLinkDTO {
  return {
    id: link.id,
    projectId: link.projectId,
    title: link.title,
    url: link.url,
    createdById: link.createdById,
    createdAt: link.createdAt.toISOString(),
  }
}

export function toProjectAttachmentDTO(
  attachment: ProjectAttachment,
  url: string,
): ProjectAttachmentDTO {
  return {
    id: attachment.id,
    projectId: attachment.projectId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
    url,
    uploadedById: attachment.uploadedById,
    createdAt: attachment.createdAt.toISOString(),
  }
}
