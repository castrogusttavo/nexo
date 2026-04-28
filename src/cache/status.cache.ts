import { ensureRedisConnected } from '@/src/lib/redis'
import type { Snapshot } from '@/types/status'

const KEY = 'status:snapshot:v1'
const TTL = 30

export const StatusCache = {
  async get(): Promise<Snapshot | null> {
    const client = await ensureRedisConnected()
    const data = await client.get(KEY)
    if (!data) return null
    return JSON.parse(data) as Snapshot
  },

  async set(snapshot: Snapshot): Promise<void> {
    const client = await ensureRedisConnected()
    await client.set(KEY, JSON.stringify(snapshot), { EX: TTL })
  },

  async invalidate(): Promise<void> {
    const client = await ensureRedisConnected()
    await client.del(KEY)
  },
}
