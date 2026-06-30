import { RateLimiterMemory } from 'rate-limiter-flexible'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/axiom/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { authLimiter, consume } from '@/src/lib/rate-limit'
import * as redisModule from '@/src/lib/redis'

afterEach(() => {
  vi.restoreAllMocks()
})

// This file is intentionally isolated from rate-limit.integration.test.ts: it
// relies on the module-level connection cache starting empty so the very first
// consume() call exercises ensureConnection()'s failure path.
describe('consume() connection failure', () => {
  it('resets the connection cache and resolves ok when Redis connection fails', async () => {
    vi.spyOn(redisModule, 'ensureRedisConnected').mockRejectedValue(
      new Error('redis down'),
    )

    const result = await consume(authLimiter, 'ip:connection-fail')

    expect(result.ok).toBe(true)
  })

  it('resolves ok and logs a store error on non-rate-limit failures', async () => {
    vi.spyOn(redisModule, 'ensureRedisConnected').mockResolvedValue(
      undefined as never,
    )
    vi.spyOn(authLimiter, 'consume').mockRejectedValue(
      new Error('store exploded'),
    )

    const result = await consume(authLimiter, 'ip:store-fail')

    expect(result.ok).toBe(true)
  })

  it('logs a store error with String(cause) for non-Error rejections', async () => {
    vi.spyOn(redisModule, 'ensureRedisConnected').mockResolvedValue(
      undefined as never,
    )
    vi.spyOn(authLimiter, 'consume').mockRejectedValue('weird failure')

    const result = await consume(authLimiter, 'ip:store-fail-string')

    expect(result.ok).toBe(true)
  })

  it('falls back to the "unknown" limiter name for an unregistered limiter', async () => {
    const orphan = new RateLimiterMemory({ points: 1, duration: 60 })

    const result = await consume(orphan as never, 'orphan-key')

    expect(result.ok).toBe(true)
  })
})
