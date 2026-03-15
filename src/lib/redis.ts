import { createClient, createSentinel } from 'redis'

type RedisClient = ReturnType<typeof createClient>

const SOCKET_DEFAULTS = {
  connectTimeout: 5000,
  reconnectStrategy(retries: number) {
    if (retries > 10) return false as const
    return Math.min(retries * 100, 3000)
  },
}

function parseSentinelHosts(raw: string) {
  return raw.split(',').map((entry) => {
    const [host, port] = entry.trim().split(':')
    return { host, port: Number(port) || 26379 }
  })
}

function createRedisClient(): RedisClient {
  const sentinelHosts = process.env.REDIS_SENTINEL_HOSTS

  if (sentinelHosts) {
    const sentinel = createSentinel({
      sentinelRootNodes: parseSentinelHosts(sentinelHosts),
      name: process.env.REDIS_SENTINEL_NAME ?? 'mymaster',
      nodeClientOptions: {
        password: process.env.REDIS_PASSWORD,
        socket: SOCKET_DEFAULTS,
      },
      sentinelClientOptions: {
        password: process.env.REDIS_SENTINEL_PASSWORD,
        socket: SOCKET_DEFAULTS,
      },
    })

    sentinel.on('error', (err: Error) => {
      console.error('[Redis Sentinel] Connection error:', err)
    })

    return sentinel as unknown as RedisClient
  }

  const client = createClient({
    url: process.env.REDIS_URL,
    socket: SOCKET_DEFAULTS,
  })

  client.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err)
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
