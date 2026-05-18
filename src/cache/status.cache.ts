import { logger } from '@/lib/axiom/logger'
import { ensureRedisConnected } from '@/src/lib/redis'
import type { Snapshot } from '@/types/status'

const KEY = 'status:snapshot:v1'
const TTL = 30

export const StatusCache = {
  async get(): Promise<Snapshot | null> {
    try {
      const client = await ensureRedisConnected()
      const data = await client.get(KEY)
      if (!data) return null
      return JSON.parse(data) as Snapshot
    } catch (cause) {
      logger.warn('cache.status.get_failed', {
        component: 'StatusCache',
        message: cause instanceof Error ? cause.message : String(cause),
      })
      return null
    }
  },

  async set(snapshot: Snapshot): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.set(KEY, JSON.stringify(snapshot), { EX: TTL })
    } catch (cause) {
      logger.warn('cache.status.set_failed', {
        component: 'StatusCache',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },

  async invalidate(): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.del(KEY)
    } catch (cause) {
      logger.warn('cache.status.invalidate_failed', {
        component: 'StatusCache',
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },
}
