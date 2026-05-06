import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createFakeUserDTO } from '@/src/__tests__/factories/user.factory'
import { UserCache } from '@/src/cache/user.cache'
import { ensureRedisConnected, redis } from '@/src/lib/redis'

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  const keys = await redis.keys('user:*')
  if (keys.length > 0) {
    await redis.del(keys)
  }
})

afterAll(async () => {
  if (redis.isOpen) {
    await redis.disconnect()
  }
})

describe('UserCache', () => {
  describe('set() + get()', () => {
    it('should store and retrieve a UserDTO', async () => {
      const dto = createFakeUserDTO({ id: 'cache-user-1' })

      await UserCache.set('cache-user-1', dto)
      const cached = await UserCache.get('cache-user-1')

      expect(cached).toEqual(dto)
    })

    it('should return null for non-existent key', async () => {
      const cached = await UserCache.get('non-existent')

      expect(cached).toBeNull()
    })

    it('should preserve all DTO fields through serialization', async () => {
      const dto = createFakeUserDTO({
        id: 'cache-user-2',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        image: 'https://example.com/photo.jpg',
        memberships: [
          {
            workspaceId: 'workspace-1',
            slug: 'workspace',
            name: 'Workspace',
            role: 'ADMIN',
          },
        ],
      })

      await UserCache.set('cache-user-2', dto)
      const cached = await UserCache.get('cache-user-2')

      expect(cached).toEqual(dto)
    })
  })

  describe('invalidate()', () => {
    it('should remove the cached entry', async () => {
      const dto = createFakeUserDTO({ id: 'cache-user-3' })
      await UserCache.set('cache-user-3', dto)

      await UserCache.invalidate('cache-user-3')
      const cached = await UserCache.get('cache-user-3')

      expect(cached).toBeNull()
    })

    it('should not affect other cached entries', async () => {
      const dto1 = createFakeUserDTO({ id: 'cache-user-4' })
      const dto2 = createFakeUserDTO({ id: 'cache-user-5' })
      await UserCache.set('cache-user-4', dto1)
      await UserCache.set('cache-user-5', dto2)

      await UserCache.invalidate('cache-user-4')

      expect(await UserCache.get('cache-user-4')).toBeNull()
      expect(await UserCache.get('cache-user-5')).toEqual(dto2)
    })
  })

  describe('TTL', () => {
    it('should set TTL of 15 minutes (900 seconds)', async () => {
      const dto = createFakeUserDTO({ id: 'cache-user-ttl' })

      await UserCache.set('cache-user-ttl', dto)
      const ttl = await redis.ttl('user:cache-user-ttl')

      expect(ttl).toBeGreaterThan(895)
      expect(ttl).toBeLessThanOrEqual(900)
    })

    it('should expire after TTL', async () => {
      const dto = createFakeUserDTO({ id: 'cache-user-expire' })

      await UserCache.set('cache-user-expire', dto)

      // Override TTL to 1 second for testing expiration
      await redis.expire('user:cache-user-expire', 1)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const cached = await UserCache.get('cache-user-expire')
      expect(cached).toBeNull()
    })
  })
})
