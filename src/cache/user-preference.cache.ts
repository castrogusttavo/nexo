import { logger } from '@/lib/axiom/logger'
import type { UserPreferenceDTO } from '@/types/user-preference.factory'
import { ensureRedisConnected } from '../lib/redis'

const PREFIX = 'pref:'
const TTL = 15 * 60 // 15 min

export const UserPreferenceCache = {
  async get(userId: string): Promise<UserPreferenceDTO | null> {
    try {
      const client = await ensureRedisConnected()
      const data = await client.get(`${PREFIX}${userId}`)

      if (!data) return null

      return JSON.parse(data) as UserPreferenceDTO
    } catch (cause) {
      logger.warn('cache.user_preference.get_failed', {
        component: 'UserPreferenceCache',
        userId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
      return null
    }
  },

  async set(userId: string, preference: UserPreferenceDTO): Promise<void> {
    try {
      const client = await ensureRedisConnected()

      await client.set(`${PREFIX}${userId}`, JSON.stringify(preference), {
        EX: TTL,
      })
    } catch (cause) {
      logger.warn('cache.user_preference.set_failed', {
        component: 'UserPreferenceCache',
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
      logger.warn('cache.user_preference.invalidate_failed', {
        component: 'UserPreferenceCache',
        userId,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
  },
}
