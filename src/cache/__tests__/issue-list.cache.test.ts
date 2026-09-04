import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { IssueListCache } from '@/src/cache/issue-list.cache'
import * as redisModule from '@/src/lib/redis'
import { ensureRedisConnected, redis } from '@/src/lib/redis'
import type { IssueDTO } from '@/types/issue'

const PROJECT_ID = 'proj-issue-list-cache'

function buildPage(): { items: IssueDTO[]; nextCursor: number | null } {
  return { items: [], nextCursor: null }
}

async function clearProjectKeys() {
  const keys = await redis.keys(`issues:list:*:${PROJECT_ID}:*`)
  const versionKeys = await redis.keys(`issues:list:v:${PROJECT_ID}`)
  const all = [...keys, ...versionKeys]
  if (all.length) await redis.del(all)
}

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await clearProjectKeys()
})

afterAll(async () => {
  if (redis.isOpen) await redis.disconnect()
})

describe('IssueListCache', () => {
  it('should return version "0" and a null page when nothing is cached', async () => {
    const { version, page } = await IssueListCache.get(PROJECT_ID, {
      limit: 20,
    })

    expect(version).toBe('0')
    expect(page).toBeNull()
  })

  it('should store and retrieve a page for the same params and version', async () => {
    const page = buildPage()
    const { version } = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    await IssueListCache.set(PROJECT_ID, version, { limit: 20 }, page)

    const cached = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    expect(cached.page).toEqual(page)
  })

  it('should key cached pages by cursor and limit independently', async () => {
    const { version } = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    await IssueListCache.set(
      PROJECT_ID,
      version,
      { cursor: 5, limit: 20 },
      buildPage(),
    )

    const withoutCursor = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    expect(withoutCursor.page).toBeNull()

    const withCursor = await IssueListCache.get(PROJECT_ID, {
      cursor: 5,
      limit: 20,
    })
    expect(withCursor.page).not.toBeNull()
  })

  it('should set a TTL of 30 seconds on the cached page', async () => {
    const { version } = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    await IssueListCache.set(PROJECT_ID, version, { limit: 20 }, buildPage())

    const ttl = await redis.ttl(
      `issues:list:page:${PROJECT_ID}:${version}:0:20`,
    )
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(30)
  })

  it('should bump the version and stop returning the stale page after invalidate()', async () => {
    const { version } = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    await IssueListCache.set(PROJECT_ID, version, { limit: 20 }, buildPage())

    await IssueListCache.invalidate(PROJECT_ID)

    const after = await IssueListCache.get(PROJECT_ID, { limit: 20 })
    expect(after.version).not.toBe(version)
    expect(after.page).toBeNull()
  })

  describe('Redis failure handling', () => {
    it('get() should return the fallback shape when redis is unavailable', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      const result = await IssueListCache.get(PROJECT_ID, { limit: 20 })
      expect(result).toEqual({ version: '0', page: null })
    })

    it('get() should swallow non-Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      const result = await IssueListCache.get(PROJECT_ID, { limit: 20 })
      expect(result).toEqual({ version: '0', page: null })
    })

    it('set() should swallow Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(
        IssueListCache.set(PROJECT_ID, '0', { limit: 20 }, buildPage()),
      ).resolves.toBeUndefined()
    })

    it('set() should swallow non-Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      await expect(
        IssueListCache.set(PROJECT_ID, '0', { limit: 20 }, buildPage()),
      ).resolves.toBeUndefined()
    })

    it('invalidate() should swallow Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        new Error('redis down'),
      )

      await expect(
        IssueListCache.invalidate(PROJECT_ID),
      ).resolves.toBeUndefined()
    })

    it('invalidate() should swallow non-Error rejections', async () => {
      vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
        'redis down',
      )

      await expect(
        IssueListCache.invalidate(PROJECT_ID),
      ).resolves.toBeUndefined()
    })
  })
})
