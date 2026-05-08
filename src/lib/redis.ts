import { readFileSync } from 'node:fs'
import { createClient } from 'redis'
import { logger } from '@/lib/axiom/logger'
import {
  REDIS_TLS_CA_PATH,
  REDIS_TLS_ENABLED,
  REDIS_URL,
} from '@/lib/env/server'

type RedisClient = ReturnType<typeof createClient>

const SOCKET_DEFAULTS = {
  connectTimeout: 5000,
  reconnectStrategy(retries: number) {
    if (retries > 10) return false as const
    return Math.min(retries * 100, 3000)
  },
}

function buildSocketOptions() {
  if (!REDIS_TLS_ENABLED) return SOCKET_DEFAULTS
  const ca = REDIS_TLS_CA_PATH ? readFileSync(REDIS_TLS_CA_PATH) : undefined
  return { ...SOCKET_DEFAULTS, tls: true as const, ca }
}

function createRedisClient(): RedisClient {
  const client = createClient({
    url: REDIS_URL,
    socket: buildSocketOptions(),
  })

  client.on('error', (err: Error) => {
    logger.error('redis.connection_error', {
      component: 'Redis',
      message: err.message,
      stack: err.stack,
    })
  })

  return client
}

export const redis = createRedisClient()

export async function ensureRedisConnected() {
  if (!redis.isOpen) {
    await redis.connect()
  }
  return redis
}
