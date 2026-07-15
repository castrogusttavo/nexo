import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/axiom/server', () => ({
  withAxiom: (handler: (request: NextRequest) => Promise<Response>) => handler,
}))
vi.mock('@/src/lib/auth-session', () => ({
  getAuthSession: vi.fn(),
}))
vi.mock('@/src/lib/rate-limit', () => ({
  apiLimiter: {},
  consume: vi.fn(),
}))
vi.mock('@/src/lib/consent', () => ({
  requireConsent: vi.fn(),
}))

import { z } from 'zod'
import { forbidden, rateLimited, unauthorized } from '@/src/errors'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { consume } from '@/src/lib/rate-limit'
import { err, ok } from '@/src/lib/result'
import { withAuthenticatedRoute, withValidatedBody } from '../api-handler'

const mockedGetAuthSession = vi.mocked(getAuthSession)
const mockedConsume = vi.mocked(consume)
const mockedRequireConsent = vi.mocked(requireConsent)

function request(init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest('http://localhost/api/test', init)
}

// `withAxiom`'s real type (createAxiomRouteHandler) requires a second `ctx`
// arg even though it's unused by these handlers — the mock above only
// replaces the runtime, not the static type checked here.
describe('withAuthenticatedRoute()', () => {
  it('should return 401 when there is no session', async () => {
    mockedGetAuthSession.mockResolvedValue(err(unauthorized()))

    const route = withAuthenticatedRoute(async () => ok({ hello: 'world' }))
    const response = await route(request(), undefined)

    expect(response.status).toBe(401)
  })

  it('should return 429 when the rate limit is exceeded', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(err(rateLimited(30)))

    const route = withAuthenticatedRoute(async () => ok({ hello: 'world' }))
    const response = await route(request(), undefined)

    expect(response.status).toBe(429)
  })

  it('should return 403 when consent is required and missing', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))
    mockedRequireConsent.mockResolvedValue(err(forbidden()))

    const route = withAuthenticatedRoute(async () => ok({ hello: 'world' }), {
      consentResource: 'page:(private)',
    })
    const response = await route(request(), undefined)

    expect(response.status).toBe(403)
    expect(mockedRequireConsent).toHaveBeenCalledWith('u1', 'page:(private)')
  })

  it('should skip the consent check when consentResource is not set', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))

    const route = withAuthenticatedRoute(async () => ok({ hello: 'world' }))
    await route(request(), undefined)

    expect(mockedRequireConsent).not.toHaveBeenCalled()
  })

  it('should call the handler with the request and userId, returning its data', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))
    const handler = vi.fn().mockResolvedValue(ok({ hello: 'world' }))

    const route = withAuthenticatedRoute(handler)
    const response = await route(request(), undefined)
    const body = await response.json()

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
    )
    expect(response.status).toBe(200)
    expect(body.data).toEqual({ hello: 'world' })
  })

  it('should use the custom successStatus when provided', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))

    const route = withAuthenticatedRoute(async () => ok({ created: true }), {
      successStatus: 201,
    })
    const response = await route(request(), undefined)

    expect(response.status).toBe(201)
  })

  it('should return the error response when the handler fails', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))

    const route = withAuthenticatedRoute(async () => err(forbidden()))
    const response = await route(request(), undefined)

    expect(response.status).toBe(403)
  })
})

describe('withValidatedBody()', () => {
  const schema = z.object({ name: z.string() })

  it('should parse a valid body and call the handler with data', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))
    const handler = vi.fn().mockResolvedValue(ok({ ok: true }))

    const route = withValidatedBody(schema, handler)
    const response = await route(
      request({ method: 'POST', body: JSON.stringify({ name: 'Ana' }) }),
      undefined,
    )

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Ana' } }),
    )
    expect(response.status).toBe(200)
  })

  it('should return VALIDATION_ERROR for an invalid body', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))
    const handler = vi.fn()

    const route = withValidatedBody(schema, handler)
    const response = await route(
      request({ method: 'POST', body: JSON.stringify({}) }),
      undefined,
    )
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should return VALIDATION_ERROR when the body is not valid JSON', async () => {
    mockedGetAuthSession.mockResolvedValue(ok({ user: { id: 'u1' } } as never))
    mockedConsume.mockResolvedValue(ok(undefined))
    const handler = vi.fn()

    const route = withValidatedBody(schema, handler)
    const response = await route(
      request({ method: 'POST', body: 'not json' }),
      undefined,
    )

    expect(response.status).toBe(422)
    expect(handler).not.toHaveBeenCalled()
  })
})
