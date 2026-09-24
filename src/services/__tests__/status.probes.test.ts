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
vi.mock('@/lib/env/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env/env')>()
  return { ...actual, NEXT_PUBLIC_URL: 'https://nexo.test' }
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

const s3 = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue({}) }))
vi.mock('@/src/lib/storage/s3', () => ({ getS3Client: () => s3 }))

// One fake BullMQ queue per real one, with the two numbers the probe reads.
const queues = vi.hoisted(() => {
  const state: Record<string, { workers: number; waiting: number }> = {
    'data-retention': { workers: 1, waiting: 0 },
    'account-lifecycle': { workers: 1, waiting: 0 },
    'data-export': { workers: 1, waiting: 0 },
    'trial-lifecycle': { workers: 1, waiting: 0 },
  }
  const queue = (name: string) => ({
    name,
    getWorkers: async () => Array.from({ length: state[name].workers }),
    getWaitingCount: async () => state[name].waiting,
  })
  return { state, queue }
})
vi.mock('@/src/lib/queue/queues', () => ({
  getDataRetentionQueue: () => queues.queue('data-retention'),
  getAccountLifecycleQueue: () => queues.queue('account-lifecycle'),
  getDataExportQueue: () => queues.queue('data-export'),
  getTrialLifecycleQueue: () => queues.queue('trial-lifecycle'),
}))

import { ensureRedisConnected } from '@/src/lib/redis'
import {
  componentsForTier,
  isSlow,
  probeApp,
  probeAuth,
  probeCache,
  probeDatabase,
  probeEmail,
  probeJobs,
  probePayment,
  probeStorage,
  runProbesForTier,
} from '@/src/services/status/probes'

let fetchSpy: MockInstance<typeof fetch>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch')
  s3.send.mockReset().mockResolvedValue({})
  for (const name of Object.keys(queues.state)) {
    queues.state[name] = { workers: 1, waiting: 0 }
  }
})

afterEach(() => {
  fetchSpy.mockRestore()
  vi.restoreAllMocks()
})

/** Forces the next probe attempt to measure exactly `ms`. */
function measure(ms: number) {
  const nowSpy = vi.spyOn(Date, 'now')
  nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_000 + ms)
  return nowSpy
}

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
      'jobs',
      'storage',
    ])
  })
})

// The budgets are the whole point of this file: one 1.5s threshold for every
// component reported Resend at 50-73% "uptime" on days it answered every
// request, because a cross-border HTTPS call with a cold TLS handshake was
// held to a budget written for a local `SELECT 1`.
describe('per-component latency budgets', () => {
  it('gives a remote API room a local query does not get', () => {
    expect(isSlow('database', 1_200)).toBe(true)
    expect(isSlow('email', 1_200)).toBe(false)
    expect(isSlow('payment', 1_200)).toBe(false)
  })

  it('still calls a genuinely slow remote API slow', () => {
    expect(isSlow('email', 4_000)).toBe(true)
    expect(isSlow('payment', 4_000)).toBe(true)
  })

  it('treats the budget itself as fast (strictly greater is slow)', () => {
    expect(isSlow('database', 1_000)).toBe(false)
    expect(isSlow('database', 1_001)).toBe(true)
  })
})

describe('probe primitives', () => {
  it('probeApp() asks the public URL, so nginx and TLS are covered', async () => {
    fetchSpy.mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }))

    const result = await probeApp()

    expect(result.status).toBe('OPERATIONAL')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://nexo.test/api/health')
  })

  it('probeApp() reports an outage when the public URL answers 5xx', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 502 }))

    const result = await probeApp()

    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('App HTTP 502')
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

  it('probeCache() returns MAJOR_OUTAGE when Redis keeps not replying PONG', async () => {
    vi.mocked(ensureRedisConnected).mockResolvedValue({
      ping: vi.fn().mockResolvedValue('NOPE'),
    } as never)

    const result = await probeCache()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('Unexpected reply')
  })

  it('probeCache() reports MAJOR_OUTAGE when the client throws a non-Error', async () => {
    vi.mocked(ensureRedisConnected).mockRejectedValue('redis exploded')

    const result = await probeCache()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toBe('redis exploded')
  })

  it('probeAuth() returns OPERATIONAL when getSession resolves', async () => {
    const result = await probeAuth()
    expect(result.status).toBe('OPERATIONAL')
  })

  it('classifies a slow sample as DEGRADED against its own budget', async () => {
    measure(2_000)

    const result = await probeDatabase()

    expect(result.status).toBe('DEGRADED')
    expect(result.latencyMs).toBe(2_000)
  })

  it('keeps a sample at exactly the budget OPERATIONAL', async () => {
    measure(1_000)

    const result = await probeDatabase()

    expect(result.latencyMs).toBe(1_000)
    expect(result.status).toBe('OPERATIONAL')
  })
})

// A status page that cries MAJOR_OUTAGE over one dropped packet is a status
// page nobody reads. One retry costs 250ms and removes most of that noise.
describe('one retry before declaring an outage', () => {
  it('recovers when the first attempt fails and the second succeeds', async () => {
    const ping = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('PONG')
    vi.mocked(ensureRedisConnected).mockResolvedValue({ ping } as never)

    const result = await probeCache()

    expect(result.status).toBe('OPERATIONAL')
    expect(result.error).toBeNull()
    expect(ping).toHaveBeenCalledTimes(2)
  })

  it('declares the outage when both attempts fail, keeping the first error', async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND api.resend.com'))
      .mockRejectedValue(new Error('socket hang up'))

    const result = await probeEmail()

    expect(result.status).toBe('MAJOR_OUTAGE')
    // The first failure is the diagnostic one; the retry's error is usually
    // a less useful consequence of it.
    expect(result.error).toContain('ENOTFOUND')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('does not retry a successful-but-slow sample', async () => {
    measure(4_000)
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const result = await probeEmail()

    expect(result.status).toBe('DEGRADED')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('probeEmail()', () => {
  it('returns OPERATIONAL when Resend answers 200', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const result = await probeEmail()
    expect(result.status).toBe('OPERATIONAL')
    expect(result.error).toBeNull()
  })

  // Same lesson as the payment probe: a key that stopped working is an outage
  // of e-mail delivery, however healthy Resend itself is.
  it.each([
    401, 403,
  ])('reports a rejected credential (%i) as an outage', async (status) => {
    fetchSpy.mockResolvedValue(new Response('nope', { status }))

    const result = await probeEmail()

    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('rejected our credential')
  })

  it('reports a server error as an outage', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 503 }))

    const result = await probeEmail()
    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('Resend HTTP 503')
  })
})

// `/minio/health/live` answers 200 to anyone, so it could not tell "the
// process is alive" from "we can still use it" -- exactly the gap that let an
// expired payment credential sit behind a green status page.
describe('probeStorage()', () => {
  it('lists buckets with our credentials instead of pinging a health URL', async () => {
    const result = await probeStorage()

    expect(result.status).toBe('OPERATIONAL')
    expect(s3.send).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports an outage when the credentials are refused', async () => {
    s3.send.mockRejectedValue(new Error('InvalidAccessKeyId'))

    const result = await probeStorage()

    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('InvalidAccessKeyId')
  })
})

describe('probePayment()', () => {
  it('returns OPERATIONAL when the customer list answers', async () => {
    fetchSpy.mockResolvedValue(new Response('[]', { status: 200 }))

    expect((await probePayment()).status).toBe('OPERATIONAL')
  })

  it('treats a 500 as an outage and a 400 as an answer', async () => {
    fetchSpy.mockResolvedValue(new Response('err', { status: 500 }))
    expect((await probePayment()).status).toBe('MAJOR_OUTAGE')

    // A 4xx that is not about our credential still means the gateway
    // answered us, which is all this probe claims to know.
    fetchSpy.mockResolvedValue(new Response('bad query', { status: 400 }))
    expect((await probePayment()).status).toBe('OPERATIONAL')
  })

  // Regression: an invalid AbacatePay key answered 401, the probe read that
  // as "the gateway is up" and the status page stayed green while every
  // checkout returned 502.
  it.each([
    401, 403,
  ])('reports a rejected payment credential (%i) as an outage', async (status) => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        status,
      }),
    )

    const result = await probePayment()

    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('rejected our credential')
  })
})

// The worker is a separate process from Next. When it dies, the app keeps
// serving pages while account deletions, exports and the nightly cleanups
// quietly stop happening — the failure this probe exists for.
describe('probeJobs()', () => {
  it('is OPERATIONAL when every queue has a worker and no backlog', async () => {
    const result = await probeJobs()

    expect(result.status).toBe('OPERATIONAL')
    expect(result.error).toBeNull()
  })

  it('reports an outage naming the queue nobody is consuming', async () => {
    queues.state['data-export'] = { workers: 0, waiting: 0 }

    const result = await probeJobs()

    expect(result.status).toBe('MAJOR_OUTAGE')
    expect(result.error).toContain('data-export')
  })

  // Working badly is neither slow nor down: the queue answers instantly and
  // the jobs still are not being done.
  it('degrades — without an error — when jobs pile up', async () => {
    queues.state['account-lifecycle'] = { workers: 1, waiting: 120 }

    const result = await probeJobs()

    expect(result.status).toBe('DEGRADED')
    expect(result.error).toContain('120 jobs aguardando')
    expect(result.error).toContain('account-lifecycle')
  })

  it('tolerates a handful of jobs waiting to be picked up', async () => {
    queues.state['data-retention'] = { workers: 1, waiting: 3 }

    expect((await probeJobs()).status).toBe('OPERATIONAL')
  })
})

describe('runProbesForTier()', () => {
  it('runs all peripheral probes and returns a map', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const result = await runProbesForTier('peripheral')

    expect(Object.keys(result).sort()).toEqual([
      'email',
      'jobs',
      'payment',
      'storage',
    ])
    expect(result.payment?.status).toBe('OPERATIONAL')
    expect(result.storage?.status).toBe('OPERATIONAL')
  })

  it('marks payment as MAJOR_OUTAGE when AbacatePay returns 5xx', async () => {
    fetchSpy.mockResolvedValue(new Response('err', { status: 502 }))

    const result = await runProbesForTier('peripheral')

    expect(result.payment?.status).toBe('MAJOR_OUTAGE')
    expect(result.payment?.error).toContain('AbacatePay HTTP 502')
  })
})
