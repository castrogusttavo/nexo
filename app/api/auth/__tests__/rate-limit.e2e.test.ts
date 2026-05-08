import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { ensureRedisConnected, redis } from '@/src/lib/redis'

const HEADERS_BASE = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

beforeAll(async () => {
  await ensureRedisConnected()
})

afterAll(async () => {
  // Clean every rate-limit bucket so other e2e suites are not blocked.
  const keys = await redis.keys('rl:*')
  if (keys.length > 0) await redis.del(keys)
  if (redis.isOpen) await redis.disconnect()
})

describe('Auth rate-limit', () => {
  it('should return 429 with Retry-After after 10 sign-in attempts from same IP', async () => {
    // Use a unique IP via x-forwarded-for so we don't pollute another bucket.
    const ip = `9.9.9.${Math.floor(Math.random() * 250) + 1}`
    const headers = { ...HEADERS_BASE, 'x-forwarded-for': ip }

    let lastStatus = 0
    let lastRetryAfter: string | null = null

    for (let i = 0; i < 11; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: `rl-${i}@example.com`,
          password: 'WrongPassword!1',
        }),
      })
      lastStatus = res.status
      lastRetryAfter = res.headers.get('Retry-After')
      // Drain body to free the connection.
      await res.text()
    }

    expect(lastStatus).toBe(429)
    expect(Number(lastRetryAfter)).toBeGreaterThan(0)
  })

  it('should NOT rate-limit non-protected auth endpoints (e.g. GET /api/auth/get-session)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/get-session`)
    // Either 200 with null session or some other ok-ish status — what matters
    // is that we don't hit 429.
    expect(res.status).not.toBe(429)
  })
})
