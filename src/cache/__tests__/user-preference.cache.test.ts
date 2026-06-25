import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createFakeUserPreferenceDTO } from '@/src/__tests__/factories/user-preference.factory'
import { UserPreferenceCache } from '@/src/cache/user-preference.cache'
import * as redisModule from '@/src/lib/redis'
import { ensureRedisConnected, redis } from '@/src/lib/redis'

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  vi.restoreAllMocks()
  const keys = await redis.keys('pref:*')
  if (keys.length > 0) {
    await redis.del(keys)
  }
})

afterAll(async () => {
  if (redis.isOpen) {
    await redis.disconnect()
  }
})

describe('UserPreferenceCache', () => {
  describe('set() + get()', () => {
    it('should store and retrieve a UserPreferenceDTO', async () => {
      const dto = createFakeUserPreferenceDTO()

      await UserPreferenceCache.set('pref-user-1', dto)
      const cached = await UserPreferenceCache.get('pref-user-1')

      expect(cached).toEqual(dto)
    })

    it('should return null for non-existent key', async () => {
      const cached = await UserPreferenceCache.get('non-existent')

      expect(cached).toBeNull()
    })

    it('should preserve all DTO fields through serialization', async () => {
      const dto = createFakeUserPreferenceDTO({
        theme: 'DARK',
        smoothCursor: true,
        quickSendShortcut: 'CTRL_ENTER',
        timezone: 'America/Sao_Paulo',
        weekStartsOn: 0,
        weekendDays: [5, 6],
      })

      await UserPreferenceCache.set('pref-user-2', dto)
      const cached = await UserPreferenceCache.get('pref-user-2')

      expect(cached).toEqual(dto)
    })
  })

  describe('invalidate()', () => {
    it('should remove the cached entry', async () => {
      const dto = createFakeUserPreferenceDTO()
      await UserPreferenceCache.set('pref-user-3', dto)

      await UserPreferenceCache.invalidate('pref-user-3')
      const cached = await UserPreferenceCache.get('pref-user-3')

      expect(cached).toBeNull()
    })

    it('should not affect other cached entries', async () => {
      const dto1 = createFakeUserPreferenceDTO({ theme: 'LIGHT' })
      const dto2 = createFakeUserPreferenceDTO({ theme: 'DARK' })
      await UserPreferenceCache.set('pref-user-4', dto1)
      await UserPreferenceCache.set('pref-user-5', dto2)

      await UserPreferenceCache.invalidate('pref-user-4')

      expect(await UserPreferenceCache.get('pref-user-4')).toBeNull()
      expect(await UserPreferenceCache.get('pref-user-5')).toEqual(dto2)
    })
  })

  describe('Redis failure handling', () => {
    it('get() should return null when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      const cached = await UserPreferenceCache.get('pref-user-fail')

      expect(cached).toBeNull()
    })

    it('set() should swallow non-Error rejections when redis is unavailable', async () => {
      // Reject with a non-Error value to exercise the String(cause) branch.
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      await expect(
        UserPreferenceCache.set(
          'pref-user-fail',
          createFakeUserPreferenceDTO(),
        ),
      ).resolves.toBeUndefined()
    })

    it('invalidate() should swallow errors when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(
        UserPreferenceCache.invalidate('pref-user-fail'),
      ).resolves.toBeUndefined()
    })
  })

  describe('TTL', () => {
    it('should set TTL of 15 minutes (900 seconds)', async () => {
      const dto = createFakeUserPreferenceDTO()

      await UserPreferenceCache.set('pref-user-ttl', dto)
      const ttl = await redis.ttl('pref:pref-user-ttl')

      expect(ttl).toBeGreaterThan(895)
      expect(ttl).toBeLessThanOrEqual(900)
    })
  })
})
