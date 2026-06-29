import { logger } from '@/lib/axiom/logger'
import { ensureRedisConnected } from '../lib/redis'

interface KeyedCacheConfig {
  prefix: string
  ttl: number
  name: string
}

export interface KeyedCache<T> {
  get(id: string): Promise<T | null>
  set(id: string, value: T): Promise<void>
  invalidate(id: string): Promise<void>
}

export function createKeyedCache<T>({
  prefix,
  ttl,
  name,
}: KeyedCacheConfig): KeyedCache<T> {
  const component = `${name
    .split('_')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Cache`

  function warn(
    action: 'get' | 'set' | 'invalidate',
    id: string,
    cause: unknown,
  ) {
    logger.warn(`cache.${name}.${action}_failed`, {
      component,
      key: `${prefix}${id}`,
      message: cause instanceof Error ? cause.message : String(cause),
    })
  }

  return {
    async get(id: string): Promise<T | null> {
      try {
        const client = await ensureRedisConnected()
        const data = await client.get(`${prefix}${id}`)
        if (!data) return null
        return JSON.parse(data) as T
      } catch (cause) {
        warn('set', id, cause)
      }
      return null
    },

    async set(id: string, value: T): Promise<void> {
      try {
        const client = await ensureRedisConnected()
        await client.set(`${prefix}${id}`, JSON.stringify(value), { EX: ttl })
      } catch (cause) {
        warn('set', id, cause)
      }
    },

    async invalidate(id) {
      try {
        const client = await ensureRedisConnected()
        await client.del(`${prefix}${id}`)
      } catch (cause) {
        warn('invalidate', id, cause)
      }
    },
  }
}
