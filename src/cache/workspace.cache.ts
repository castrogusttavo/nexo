import { logger } from '@/lib/axiom/logger'
import { ensureRedisConnected } from '@/src/lib/redis'
import type { WorkspaceDTO } from '@/types/workspace'

const PREFIX = 'workspace:'
const TTL = 15 * 60 // 15 minutes

export const WorkspaceCache = {
  async get(workspaceId: string): Promise<WorkspaceDTO | null> {
    try {
      const client = await ensureRedisConnected()
      const data = await client.get(`${PREFIX}${workspaceId}`)
      if (!data) return null
      return JSON.parse(data) as WorkspaceDTO
    } catch (cause) {
      logger.warn('cache.workspace.get_failed', {
        component: 'WorkspaceCache',
        workspaceId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
      return null
    }
  },

  async set(workspaceId: string, workspace: WorkspaceDTO): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.set(`${PREFIX}${workspaceId}`, JSON.stringify(workspace), {
        EX: TTL,
      })
    } catch (cause) {
      logger.warn('cache.workspace.set_failed', {
        component: 'WorkspaceCache',
        workspaceId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },

  async invalidate(workspaceId: string): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.del(`${PREFIX}${workspaceId}`)
    } catch (cause) {
      logger.warn('cache.workspace.invalidate_failed', {
        component: 'WorkspaceCache',
        workspaceId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },
}
