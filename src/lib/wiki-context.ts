import { cache } from 'react'
import type { WikiPageDTO } from '@/types/wiki-page'
import { WikiPageService } from '../services/wiki-page.service'
import { requireMembership } from './dal'

export interface WikiContext {
  userId: string
  userName: string
  workspaceId: string
  workspaceSlug: string
}

export const getWikiContext = cache(
  async (workspaceSlug: string): Promise<WikiContext | null> => {
    const { user, membership } = await requireMembership(workspaceSlug)

    return {
      userId: user.id,
      userName: user.name,
      workspaceId: membership.workspaceId,
      workspaceSlug,
    }
  },
)

export const getWikiPageContext = cache(
  async (
    workspaceSlug: string,
    wikiPageId: string,
  ): Promise<(WikiContext & { page: WikiPageDTO }) | null> => {
    const context = await getWikiContext(workspaceSlug)
    if (!context) return null

    const page = await WikiPageService.getById(
      context.userId,
      context.workspaceId,
      wikiPageId,
    )
    if (!page.ok) return null

    return { ...context, page: page.value }
  },
)
