import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createFakeNotificationSettingDTO } from '@/src/__tests__/factories/notification-setting.factory'
import { NotificationSettingCache } from '@/src/cache/notification-setting.cache'
import * as redisModule from '@/src/lib/redis'
import { ensureRedisConnected, redis } from '@/src/lib/redis'

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  vi.restoreAllMocks()
  const keys = await redis.keys('notif:*')
  if (keys.length > 0) {
    await redis.del(keys)
  }
})

afterAll(async () => {
  if (redis.isOpen) {
    await redis.disconnect()
  }
})

describe('NotificationSettingCache', () => {
  describe('set() + get()', () => {
    it('should store and retrieve a NotificationSettingDTO', async () => {
      const dto = createFakeNotificationSettingDTO()

      await NotificationSettingCache.set('notif-user-1', dto)
      const cached = await NotificationSettingCache.get('notif-user-1')

      expect(cached).toEqual(dto)
    })

    it('should return null for a non-existent key', async () => {
      const cached = await NotificationSettingCache.get('non-existent')

      expect(cached).toBeNull()
    })

    it('should preserve all DTO fields through serialization', async () => {
      const dto = createFakeNotificationSettingDTO({
        priorityChanges: false,
        stateChanges: false,
        comments: false,
        mentions: false,
      })

      await NotificationSettingCache.set('notif-user-2', dto)
      const cached = await NotificationSettingCache.get('notif-user-2')

      expect(cached).toEqual(dto)
    })
  })

  describe('invalidate()', () => {
    it('should remove the cached entry', async () => {
      const dto = createFakeNotificationSettingDTO()
      await NotificationSettingCache.set('notif-user-3', dto)

      await NotificationSettingCache.invalidate('notif-user-3')
      const cached = await NotificationSettingCache.get('notif-user-3')

      expect(cached).toBeNull()
    })

    it('should not affect other cached entries', async () => {
      const dto1 = createFakeNotificationSettingDTO({ comments: true })
      const dto2 = createFakeNotificationSettingDTO({ comments: false })
      await NotificationSettingCache.set('notif-user-4', dto1)
      await NotificationSettingCache.set('notif-user-5', dto2)

      await NotificationSettingCache.invalidate('notif-user-4')

      expect(await NotificationSettingCache.get('notif-user-4')).toBeNull()
      expect(await NotificationSettingCache.get('notif-user-5')).toEqual(dto2)
    })
  })

  describe('Redis failure handling', () => {
    it('get() should return null when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      const cached = await NotificationSettingCache.get('notif-user-fail')

      expect(cached).toBeNull()
    })

    it('set() should swallow errors when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(
        NotificationSettingCache.set(
          'notif-user-fail',
          createFakeNotificationSettingDTO(),
        ),
      ).resolves.toBeUndefined()
    })

    it('invalidate() should swallow errors when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(
        NotificationSettingCache.invalidate('notif-user-fail'),
      ).resolves.toBeUndefined()
    })
  })

  describe('TTL', () => {
    it('should set TTL of 15 minutes (900 seconds)', async () => {
      const dto = createFakeNotificationSettingDTO()

      await NotificationSettingCache.set('notif-user-ttl', dto)
      const ttl = await redis.ttl('notif:notif-user-ttl')

      expect(ttl).toBeGreaterThan(895)
      expect(ttl).toBeLessThanOrEqual(900)
    })
  })
})
