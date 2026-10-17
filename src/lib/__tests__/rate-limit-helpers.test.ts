import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/axiom/server', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  withAxiom: <T>(handler: T) => handler,
}))

vi.mock('@/lib/env/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/env/server')>()),
  TRUSTED_PROXIES: ['127.0.0.1', '10.0.0.0/8'],
}))

import { rateLimited } from '@/src/errors/app-error'
import * as rateLimitModule from '@/src/lib/rate-limit'
import { getClientIp, withRateLimit } from '@/src/lib/rate-limit-helpers'
import { err, ok } from '@/src/lib/result'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/x', { headers })
}

// How the address is resolved is covered in client-ip.test.ts; here only what
// the rate limiter adds on top: a string key, 'unknown' when there is none.
describe('getClientIp()', () => {
  it('should key the bucket on the address nginx saw', () => {
    const req = makeRequest({ 'x-forwarded-for': '9.9.9.9, 3.3.3.3' })
    expect(getClientIp(req)).toBe('3.3.3.3')
  })

  it('should return "unknown" when there is no address', () => {
    expect(getClientIp(makeRequest())).toBe('unknown')
    expect(getClientIp(makeRequest({ 'x-real-ip': '6.6.6.6' }))).toBe('unknown')
  })
})

describe('withRateLimit()', () => {
  it('should call handler when consume succeeds', async () => {
    const consumeSpy = vi
      .spyOn(rateLimitModule, 'consume')
      .mockResolvedValue(ok(undefined))

    const handler = vi.fn(async () =>
      Response.json({ ran: true }, { status: 200 }),
    )
    const wrapped = withRateLimit(
      () => ({ limiter: {} as never, key: 'k' }),
      handler,
    )

    const res = await wrapped(makeRequest())

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
    expect(consumeSpy).toHaveBeenCalledWith({}, 'k', undefined)
  })

  it('should return 429 with Retry-After when consume errors', async () => {
    vi.spyOn(rateLimitModule, 'consume').mockResolvedValue(err(rateLimited(60)))
    const handler = vi.fn()
    const wrapped = withRateLimit(
      () => ({ limiter: {} as never, key: 'k' }),
      handler,
    )

    const res = await wrapped(makeRequest())

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should skip rate limit when resolver returns null', async () => {
    const consumeSpy = vi.spyOn(rateLimitModule, 'consume')
    const handler = vi.fn(async () =>
      Response.json({ ok: true }, { status: 200 }),
    )
    const wrapped = withRateLimit(() => null, handler)

    const res = await wrapped(makeRequest())

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
    expect(consumeSpy).not.toHaveBeenCalled()
  })

  it('should forward extra args to resolver and handler', async () => {
    vi.spyOn(rateLimitModule, 'consume').mockResolvedValue(ok(undefined))
    const resolver = vi.fn((_req: Request, _slug: string) => ({
      limiter: {} as never,
      key: 'k',
      points: 5,
    }))
    const handler = vi.fn(async (_req: Request, slug: string) =>
      Response.json({ slug }, { status: 200 }),
    )
    const wrapped = withRateLimit(resolver, handler)

    const res = await wrapped(makeRequest(), 'acme')

    expect(res.status).toBe(200)
    expect(resolver).toHaveBeenCalledWith(expect.any(Request), 'acme')
    expect(handler).toHaveBeenCalledWith(expect.any(Request), 'acme')
  })
})
