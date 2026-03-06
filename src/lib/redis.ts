import { createClient } from 'redis'

function createRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy(retries) {
        if (retries > 10) return false
        return Math.min(retries * 100, 3000)
      },
    },
  })

  client.on('error', (err) => {
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
