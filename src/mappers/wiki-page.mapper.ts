import type { WikiPage } from '@prisma/client'
import type { Value } from 'platejs'
import type { WikiPageDTO } from '@/types/wiki-page'
import { withTimestamps } from './_shared'

export function toWikiPageDTO(wikiPage: WikiPage): WikiPageDTO {
  return {
    id: wikiPage.id,
    workspaceId: wikiPage.workspaceId,
    parentId: wikiPage.parentId,
    title: wikiPage.title,
    icon: wikiPage.icon,
    coverImage: wikiPage.coverImage,
    content: wikiPage.content as Value,
    position: wikiPage.position,
    createdById: wikiPage.createdById,
    updatedById: wikiPage.updatedById,
    archivedAt: wikiPage.archivedAt?.toISOString() ?? null,
    ...withTimestamps(wikiPage),
  }
}
