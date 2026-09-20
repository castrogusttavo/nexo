import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env/server')>()
  return {
    ...actual,
    RESEND_API_KEY: 'resend-key',
    MINIO_ENDPOINT: 'http://minio.test',
    ABACATE_PAY: 'abacate-key',
  }
})
vi.mock('@/src/lib/auth', () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}))
vi.mock('@/src/lib/redis', () => ({
  ensureRedisConnected: vi.fn().mockResolvedValue({
    ping: vi.fn().mockResolvedValue('PONG'),
  }),
}))
vi.mock('@/src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}))

import { ensureRedisConnected } from '@/src/lib/redis'
import {
  componentsForTier,
  probeApp,
  probeAuth,
  probeCache,
  probeDatabase,
  probeEmail,
  probeStorage,
  runProbesForTier,
} from '@/src/services/status/probes'

let fetchSpy: MockInstance<typeof fetch>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  fetchSpy.mockRestore()
})

describe('componentsForTier()', () => {
  it('should return core components in order', () => {
    expect(componentsForTier('core')).toEqual([
      'app',
      'database',
      'cache',
      'auth',
    ])
  })

  it('should return peripheral components', () => {
    expect(componentsForTier('peripheral')).toEqual([
      'payment',
      'email',
      'storage',
    ])
  })
})

describe('probe primitives', () => {
  it('probeApp() returns OPERATIONAL with zero latency', async () => {
    const result = await probeApp()
    expect(result).toEqual({ status: 'OPERATIONAL', latencyMs: 0, error: null })
  })

  it('probeDatabase() returns OPERATIONAL when query succeeds', async () => {
    const result = await probeDatabase()
    expect(result.status).toBe('OPERATIONAL')
    expect(result.error).toBeNull()
  })

  it('probeCache() returns OPERATIONAL when Redis pings PONG', async () => {
    const result = await probeCache()
    expect(result.status).toBe('OPERATIONAL')
  })

  it('probeCache() returns MAJOR_OUTAGE when Redis does not reply PONG', async () => {
    vi.mocked(ensureRedisConnected).mockResolvedValueOnce({
      ping: vi.fn().mockResolvedValue('NOPE'),
    } as never)

    const result = await probeCache()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('Unexpected reply')
  })

  it('probeCache() reports MAJOR_OUTAGE when the client throws a non-Error', async () => {
    vi.mocked(ensureRedisConnected).mockRejectedValueOnce('redis exploded')

    const result = await probeCache()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toBe('redis exploded')
  })

  it('classifies a slow probe as DEGRADED', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(3000)

    const result = await probeDatabase()

    expect(result.status).toBe('DEGRADED')
    expect(result.latencyMs).toBe(2000)
  })

  it('keeps a probe exactly at the degraded threshold OPERATIONAL', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(2500)

    const result = await probeDatabase()

    // 1500ms is the boundary and the comparison is strictly greater.
    expect(result.latencyMs).toBe(1500)
    expect(result.status).toBe('OPERATIONAL')
  })

  it('still measures latency on the failure path', async () => {
    vi.mocked(ensureRedisConnected).mockRejectedValueOnce(new Error('down'))
    const nowSpy = vi.spyOn(Date, 'now')
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1400)

    const result = await probeCache()

    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.latencyMs).toBe(400)
  })

  it('probeAuth() returns OPERATIONAL when getSession resolves', async () => {
    const result = await probeAuth()
    expect(result.status).toBe('OPERATIONAL')
  })

  it('probeEmail() returns MAJOR_OUTAGE when Resend HTTP errors', async () => {
    fetchSpy.mockResolvedValue(new Response('forbidden', { status: 403 }))

    const result = await probeEmail()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('Resend HTTP 403')
  })

  it('probeEmail() returns OPERATIONAL when Resend answers 200', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const result = await probeEmail()
    expect(result.status).toBe('OPERATIONAL')
    expect(result.error).toBeNull()
  })

  it('probeStorage() returns OPERATIONAL when MinIO health is 200', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const result = await probeStorage()
    expect(result.status).toBe('OPERATIONAL')
  })

  it('probeStorage() returns MAJOR_OUTAGE on non-2xx', async () => {
    fetchSpy.mockResolvedValue(new Response('down', { status: 503 }))

    const result = await probeStorage()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('MinIO HTTP 503')
  })
})

describe('runProbesForTier()', () => {
  it('runs all peripheral probes with mocked fetch and returns a map', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const result = await runProbesForTier('peripheral')

    expect(Object.keys(result).sort()).toEqual(['email', 'payment', 'storage'])
    expect(result.payment?.status).toBe('OPERATIONAL')
  })

  it('marks payment as MAJOR_OUTAGE when AbacatePay returns 5xx', async () => {
    fetchSpy.mockResolvedValue(new Response('err', { status: 502 }))

    const result = await runProbesForTier('peripheral')

    expect(result.payment?.status).toBe('MAJOR_OUTAGE')
    expect(result.payment?.error).toContain('AbacatePay HTTP 502')
  })

  it('treats a payment 500 as an outage and a 4xx as operational', async () => {
    // 500 is the inclusive boundary; 4xx means the gateway answered, which
    // for a liveness probe counts as up.
    fetchSpy.mockResolvedValue(new Response('err', { status: 500 }))
    expect((await runProbesForTier('peripheral')).payment?.status).toBe(
      'MAJOR_OUTAGE',
    )

    fetchSpy.mockResolvedValue(new Response('nope', { status: 401 }))
    expect((await runProbesForTier('peripheral')).payment?.status).toBe(
      'OPERATIONAL',
    )
  })
})
