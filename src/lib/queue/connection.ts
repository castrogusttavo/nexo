import { readFileSync } from 'node:fs'
import IORedis, { type RedisOptions } from 'ioredis'
import { logger } from '@/lib/axiom/logger'
import {
  REDIS_TLS_CA_PATH,
  REDIS_TLS_ENABLED,
  REDIS_URL,
} from '@/lib/env/_server'

function buildOptions(): RedisOptions {
  const base: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  }

  if (!REDIS_TLS_ENABLED) return base

  const ca = REDIS_TLS_CA_PATH ? readFileSync(REDIS_TLS_CA_PATH) : undefined
  return {
    ...base,
    tls: {
      ca,
      rejectUnauthorized: Boolean(ca),
    },
  }
}

let connection: IORedis | null = null

export function getQueueConnection(): IORedis {
  if (connection) return connection

  connection = new IORedis(REDIS_URL, buildOptions())

  connection.on('error', (err: Error) => {
    logger.error('queue.connection_error', {
      component: 'BullMQ',
      message: err.message,
      stack: err.stack,
    })
  })

  return connection
}

export async function closeQueueConnection(): Promise<void> {
  if (!connection) return
  await connection.quit()
  connection = null
}
