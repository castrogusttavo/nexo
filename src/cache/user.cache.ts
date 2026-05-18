import { logger } from '@/lib/axiom/logger'
import { ensureRedisConnected } from '@/src/lib/redis'
import type { UserDTO } from '@/types/user'

const PREFIX = 'user:'
const TTL = 15 * 60 // 15 minutes (same as access token)

export const UserCache = {
  async get(userId: string): Promise<UserDTO | null> {
    try {
      const client = await ensureRedisConnected()
      const data = await client.get(`${PREFIX}${userId}`)
      if (!data) return null
      return JSON.parse(data) as UserDTO
    } catch (cause) {
      logger.warn('cache.user.get_failed', {
        component: 'UserCache',
        userId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
      return null
    }
  },

  async set(userId: string, user: UserDTO): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.set(`${PREFIX}${userId}`, JSON.stringify(user), { EX: TTL })
    } catch (cause) {
      logger.warn('cache.user.set_failed', {
        component: 'UserCache',
        userId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },

  async invalidate(userId: string): Promise<void> {
    try {
      const client = await ensureRedisConnected()
      await client.del(`${PREFIX}${userId}`)
    } catch (cause) {
      logger.warn('cache.user.invalidate_failed', {
        component: 'UserCache',
        userId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },
}
