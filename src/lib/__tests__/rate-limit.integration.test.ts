import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('@/lib/axiom/server', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  withAxiom: <T>(handler: T) => handler,
}))

import {
  apiLimiter,
  authLimiter,
  consume,
  emailLimiter,
} from '@/src/lib/rate-limit'
import { ensureRedisConnected, redis } from '@/src/lib/redis'
import { handleError } from '@/utils/http-response'

beforeAll(async () => {
  await ensureRedisConnected()
})

afterEach(async () => {
  const keys = await redis.keys('rl:*')
  if (keys.length > 0) {
    await redis.del(keys)
  }
})

afterAll(async () => {
  if (redis.isOpen) {
    await redis.disconnect()
  }
})

describe('rate-limit', () => {
  describe('consume()', () => {
    it('returns ok while under the limit', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await consume(authLimiter, 'ip:1.1.1.1')
        expect(result.ok).toBe(true)
      }
    })

    it('returns RATE_LIMITED error after exhausting points', async () => {
      const key = 'ip:2.2.2.2'

      for (let i = 0; i < 10; i++) {
        const result = await consume(authLimiter, key)
        expect(result.ok).toBe(true)
      }

      const blocked = await consume(authLimiter, key)
      expect(blocked.ok).toBe(false)
      if (!blocked.ok) {
        expect(blocked.error.code).toBe('RATE_LIMITED')
        const details = blocked.error.details as { retryAfterSeconds: number }
        expect(details.retryAfterSeconds).toBeGreaterThan(0)
      }
    })

    it('isolates buckets per key', async () => {
      const keyA = 'ip:3.3.3.3'
      const keyB = 'ip:4.4.4.4'

      for (let i = 0; i < 10; i++) {
        await consume(authLimiter, keyA)
      }

      const blockedA = await consume(authLimiter, keyA)
      const stillOkB = await consume(authLimiter, keyB)

      expect(blockedA.ok).toBe(false)
      expect(stillOkB.ok).toBe(true)
    })

    it('isolates buckets per limiter', async () => {
      const key = 'shared-key'

      for (let i = 0; i < 10; i++) {
        await consume(authLimiter, key)
      }

      const blockedAuth = await consume(authLimiter, key)
      const okEmail = await consume(emailLimiter, key)
      const okApi = await consume(apiLimiter, key)

      expect(blockedAuth.ok).toBe(false)
      expect(okEmail.ok).toBe(true)
      expect(okApi.ok).toBe(true)
    })

    it('email limiter caps at 5 per hour', async () => {
      const key = 'user@example.com'
      for (let i = 0; i < 5; i++) {
        const result = await consume(emailLimiter, key)
        expect(result.ok).toBe(true)
      }

      const blocked = await consume(emailLimiter, key)
      expect(blocked.ok).toBe(false)
    })

    it('api limiter caps at 100 per minute', async () => {
      const key = 'user:abc'
      for (let i = 0; i < 100; i++) {
        const result = await consume(apiLimiter, key)
        expect(result.ok).toBe(true)
      }

      const blocked = await consume(apiLimiter, key)
      expect(blocked.ok).toBe(false)
    })
  })

  describe('handleError integration', () => {
    it('emits 429 with Retry-After header on rate limit violation', async () => {
      const key = 'ip:5.5.5.5'

      for (let i = 0; i < 10; i++) {
        await consume(authLimiter, key)
      }

      const blocked = await consume(authLimiter, key)
      expect(blocked.ok).toBe(false)
      if (!blocked.ok) {
        const response = handleError(blocked.error)
        expect(response.status).toBe(429)

        const retryAfter = response.headers.get('Retry-After')
        expect(retryAfter).not.toBeNull()
        expect(Number(retryAfter)).toBeGreaterThan(0)
      }
    })
  })

  describe('progressive block on auth limiter', () => {
    it('keeps the IP blocked even after a single short window passes', async () => {
      const key = 'ip:6.6.6.6'

      for (let i = 0; i < 10; i++) {
        await consume(authLimiter, key)
      }

      const first = await consume(authLimiter, key)
      const second = await consume(authLimiter, key)

      expect(first.ok).toBe(false)
      expect(second.ok).toBe(false)

      if (!first.ok && !second.ok) {
        const d1 = first.error.details as { retryAfterSeconds: number }
        const d2 = second.error.details as { retryAfterSeconds: number }
        expect(d1.retryAfterSeconds).toBeGreaterThan(15 * 60)
        expect(d2.retryAfterSeconds).toBeGreaterThan(0)
      }
    })
  })
})
