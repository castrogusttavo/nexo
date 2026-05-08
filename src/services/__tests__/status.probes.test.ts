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
})
