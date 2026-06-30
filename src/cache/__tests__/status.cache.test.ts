import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { StatusCache } from '@/src/cache/status.cache'
import * as redisModule from '@/src/lib/redis'
import { ensureRedisConnected, redis } from '@/src/lib/redis'
import type { Snapshot } from '@/types/status'

const SNAPSHOT_KEY = 'status:snapshot:v1'

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await redis.del(SNAPSHOT_KEY)
})

afterAll(async () => {
  if (redis.isOpen) await redis.disconnect()
})

function buildSnapshot(): Snapshot {
  return {
    overallStatus: 'OPERATIONAL',
    generatedAt: '2025-05-01T00:00:00.000Z',
    components: [],
  }
}

describe('StatusCache', () => {
  it('should store and retrieve a snapshot', async () => {
    const snap = buildSnapshot()
    await StatusCache.set(snap)

    expect(await StatusCache.get()).toEqual(snap)
  })

  it('should return null when no snapshot is cached', async () => {
    expect(await StatusCache.get()).toBeNull()
  })

  it('should invalidate the cached snapshot', async () => {
    await StatusCache.set(buildSnapshot())
    await StatusCache.invalidate()

    expect(await StatusCache.get()).toBeNull()
  })

  it('should set TTL of 30 seconds', async () => {
    await StatusCache.set(buildSnapshot())

    const ttl = await redis.ttl(SNAPSHOT_KEY)
    expect(ttl).toBeGreaterThan(25)
    expect(ttl).toBeLessThanOrEqual(30)
  })

  describe('Redis failure handling', () => {
    it('get() should return null when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      expect(await StatusCache.get()).toBeNull()
    })

    it('get() should swallow non-Error rejections', async () => {
      // Reject with a non-Error value to exercise the String(cause) branch.
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      expect(await StatusCache.get()).toBeNull()
    })

    it('set() should swallow non-Error rejections when redis is unavailable', async () => {
      // Reject with a non-Error value to exercise the String(cause) branch.
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      await expect(StatusCache.set(buildSnapshot())).resolves.toBeUndefined()
    })

    it('set() should swallow Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(StatusCache.set(buildSnapshot())).resolves.toBeUndefined()
    })

    it('invalidate() should swallow errors when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(StatusCache.invalidate()).resolves.toBeUndefined()
    })

    it('invalidate() should swallow non-Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      await expect(StatusCache.invalidate()).resolves.toBeUndefined()
    })
  })
})
