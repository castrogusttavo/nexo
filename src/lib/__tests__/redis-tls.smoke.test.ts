import { readFileSync } from 'node:fs'
import IORedis from 'ioredis'
import { createClient } from 'redis'
import { afterAll, describe, expect, it } from 'vitest'

const url = process.env.REDIS_URL
const caPath = process.env.REDIS_TLS_CA_PATH
const tlsEnabled = url?.startsWith('rediss://') && !!caPath

const clients: Array<{ quit: () => Promise<unknown> }> = []

afterAll(async () => {
  await Promise.allSettled(clients.map((c) => c.quit()))
})

describe.skipIf(!tlsEnabled)('Redis TLS smoke', () => {
  const ca = caPath ? readFileSync(caPath) : Buffer.alloc(0)

  it('node-redis client completes TLS handshake and PINGs', async () => {
    const client = createClient({
      url,
      socket: { tls: true, ca, connectTimeout: 5000 },
    })
    clients.push(client)
    await client.connect()
    expect(await client.ping()).toBe('PONG')
  })

  it('ioredis (BullMQ transport) completes TLS handshake and PINGs', async () => {
    const conn = new IORedis(url as string, {
      tls: { ca, rejectUnauthorized: true },
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: false,
    })
    clients.push(conn)
    expect(await conn.ping()).toBe('PONG')
  })
})
