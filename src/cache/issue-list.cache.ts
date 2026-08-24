import { logger } from '@/lib/axiom/logger'
import type { IssueDTO } from '@/types/issue'
import { ensureRedisConnected } from '../lib/redis'

const TTL = 30

type IssuesPage = { items: IssueDTO[]; nextCursor: number | null }

function versionKey(projectId: string): string {
  return `issues:list:v:${projectId}`
}

function pageKey(
  projectId: string,
  version: string,
  cursor: number | undefined,
  limit: number,
): string {
  return `issues:list:page:${projectId}:${version}:${cursor ?? 0}:${limit}`
}

export const IssueListCache = {
  async get(
    projectId: string,
    params: { cursor?: number; limit: number },
  ): Promise<{ version: string; page: IssuesPage | null }> {
    try {
      const client = await ensureRedisConnected()
      const version = (await client.get(versionKey(projectId))) ?? '0'
      const key = pageKey(projectId, version, params.cursor, params.limit)

      const data = await client.get(key)
      return { version, page: data ? (JSON.parse(data) as IssuesPage) : null }
    } catch (cause) {
      logger.warn('cache.issue_list.get_failed', {
        component: 'IssueListCache',
        message: cause instanceof Error ? cause.message : String(cause),
      })
      return { version: '0', page: null }
    }
  },

  async set(
    projectId: string,
    version: string,
    params: { cursor?: number; limit: number },
    page: IssuesPage,
  ): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      const key = pageKey(projectId, version, params.cursor, params.limit)
      await client.set(key, JSON.stringify(page), { EX: TTL })
    } catch (cause) {
      logger.warn('cache.issue_list.set_failed', {
        component: 'IssueListCache',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },

  async invalidate(projectId: string): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.incr(versionKey(projectId))
    } catch (cause) {
      logger.warn('cache.issue_list.invalidate_failed', {
        component: 'IssueListCache',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },
}
