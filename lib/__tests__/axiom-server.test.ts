import { getLogLevelFromStatusCode, getNextErrorStatusCode, transformRouteHandlerErrorResult, transformRouteHandlerSuccessResult } from '@axiomhq/nextjs';
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Records the order in which the request-time gate and the Axiom wrapper run,
// and captures the callbacks lib/axiom/server.ts hands to the Axiom wrapper.
const { calls, connection, axiomConfig, fakeLogger } = vi.hoisted(() => {
  const calls: string[] = []
  return {
    calls,
    connection: vi.fn(async () => {
      calls.push('connection')
    }),
    axiomConfig: {} as {
      onSuccess?: (data: unknown) => void
      onError?: (data: unknown) => void
    },
    fakeLogger: { info: vi.fn(), error: vi.fn(), log: vi.fn(), flush: vi.fn() },
  }
})

vi.mock('next/server', () => ({ connection }))

vi.mock('@/lib/axiom/logger', () => ({ logger: fakeLogger }))

// The Axiom wrapper logs and flushes around the handler; stand in for it so
// the test sees when it starts.
vi.mock('@axiomhq/nextjs', () => ({
  createAxiomRouteHandler: (_logger: unknown, config: typeof axiomConfig) => {
    Object.assign(axiomConfig, config)
    return (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
      async (req: Request, ctx: unknown) => {
        calls.push('axiom')
        return handler(req, ctx)
      }
  },
  transformRouteHandlerSuccessResult: () => ['GET /x 200 in 1ms', {}],
  transformRouteHandlerErrorResult: () => ['GET /x 404 in 1ms', {}],
  getNextErrorStatusCode: () => 404,
  getLogLevelFromStatusCode: (status: number) =>
    status < 500 ? 'warn' : 'error'
}))

import { withAxiom } from '@/lib/axiom/server'

const statusRequest = () =>
  new Request('http://localhost/api/status') as NextRequest

beforeEach(() => {
  calls.length = 0
  vi.clearAllMocks()
})

describe('withAxiom', () => {
  it('waits for a real request before the Axiom wrapper runs anything', async () => {
    const handler = vi.fn(async () => {
      calls.push('handler')
      return new Response('ok')
    })

    const response = await withAxiom(handler)(statusRequest(), {})

    // `connection()` never resolves while Next prerenders, so nothing after
    // it -- the Axiom logs and their fetch() flush -- runs at build time.
    expect(calls).toEqual(['connection', 'axiom', 'handler'])
    expect(await response.text()).toBe('ok')
  })

  it('never reaches the handler while connection() is pending (prerender)', async () => {
    connection.mockImplementationOnce(() => new Promise<void>(() => {}))
    const handler = vi.fn(async () => new Response('ok'))

    void withAxiom(handler)(statusRequest(), {})
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(calls).toEqual([])
    expect(handler).not.toHaveBeenCalled()
  })
})

// A flush per request queues behind the previous one and holds the request
// in memory until it drains (the 2026-10-16 OOM); batching is left to the
// Axiom client instead.
describe('withAxiom logging', () => {
  it('logs a successful request without flushing it', () => {
    axiomConfig.onSuccess?.({
      req: statusRequest(),
      res: new Response(),
      start: 0,
      end: 1,
    })

    expect(fakeLogger.info).toHaveBeenCalledOnce()
    expect(fakeLogger.flush).not.toHaveBeenCalled()
  })

  it('logs a failed request at its real level without flushing it', () => {
    axiomConfig.onError?.({
      req: statusRequest(),
      error: new Error('nope'),
      start: 0,
      end: 1,
    })

    expect(fakeLogger.error).toHaveBeenCalledWith('nope', expect.any(Error))
    expect(fakeLogger.log).toHaveBeenCalledWith('warn', 'GET /x 404 in 1ms', {})
    expect(fakeLogger.flush).not.toHaveBeenCalled()
  })
})