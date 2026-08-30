import { cache } from 'react'
import type { WikiPageDTO } from '@/types/wiki-page'
import { MembershipService } from '../services/membership.service'
import { WikiPageService } from '../services/wiki-page.service'
import { getAuthSession } from './auth-session'

export interface WikiContext {
  userId: string
  workspaceId: string
  workspaceSlug: string
}

export const getWikiContext = cache(
  async (workspaceSlug: string): Promise<WikiContext | null> => {
    const session = await getAuthSession()
    if (!session.ok) return null

    const membership = await MembershipService.getByUserAndSlug(
      session.value.user.id,
      workspaceSlug,
    )
    if (!membership.ok || !membership.value) return null

    return {
      userId: session.value.user.id,
      workspaceId: membership.value.workspaceId,
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
