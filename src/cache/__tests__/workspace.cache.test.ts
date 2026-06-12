import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createFakeWorkspaceDTO } from '@/src/__tests__/factories/workspace.factory'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import * as redisModule from '@/src/lib/redis'
import { ensureRedisConnected, redis } from '@/src/lib/redis'

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  vi.restoreAllMocks()
  const keys = await redis.keys('workspace:*')
  if (keys.length > 0) await redis.del(keys)
})

afterAll(async () => {
  if (redis.isOpen) await redis.disconnect()
})

describe('WorkspaceCache', () => {
  describe('set() + get()', () => {
    it('should store and retrieve a WorkspaceDTO', async () => {
      const dto = createFakeWorkspaceDTO({ id: 'ws-cache-1' })
      await WorkspaceCache.set('ws-cache-1', dto)

      const cached = await WorkspaceCache.get('ws-cache-1')

      expect(cached).toEqual(dto)
    })

    it('should return null when key is absent', async () => {
      expect(await WorkspaceCache.get('absent')).toBeNull()
    })
  })

  describe('invalidate()', () => {
    it('should remove the cached entry', async () => {
      const dto = createFakeWorkspaceDTO({ id: 'ws-cache-2' })
      await WorkspaceCache.set('ws-cache-2', dto)

      await WorkspaceCache.invalidate('ws-cache-2')

      expect(await WorkspaceCache.get('ws-cache-2')).toBeNull()
    })
  })

  describe('TTL', () => {
    it('should set TTL of 15 minutes (900 seconds)', async () => {
      const dto = createFakeWorkspaceDTO({ id: 'ws-cache-ttl' })
      await WorkspaceCache.set('ws-cache-ttl', dto)

      const ttl = await redis.ttl('workspace:ws-cache-ttl')
      expect(ttl).toBeGreaterThan(895)
      expect(ttl).toBeLessThanOrEqual(900)
    })
  })

  describe('Redis failure handling', () => {
    it('get() should return null when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      expect(await WorkspaceCache.get('ws-cache-fail')).toBeNull()
    })

    it('set() should swallow non-Error rejections when redis is unavailable', async () => {
      // Reject with a non-Error value to exercise the String(cause) branch.
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      await expect(
        WorkspaceCache.set('ws-cache-fail', createFakeWorkspaceDTO()),
      ).resolves.toBeUndefined()
    })

    it('invalidate() should swallow errors when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(
        WorkspaceCache.invalidate('ws-cache-fail'),
      ).resolves.toBeUndefined()
    })
  })
})
