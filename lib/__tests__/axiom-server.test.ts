import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Records the order in which the request-time gate and the Axiom wrapper run.
const { calls, connection } = vi.hoisted(() => {
  const calls: string[] = []
  return {
    calls,
    connection: vi.fn(async () => {
      calls.push('connection')
    }),
  }
})

vi.mock('next/server', () => ({ connection }))

// The Axiom wrapper logs and flushes around the handler; stand in for it so
// the test sees when it starts.
vi.mock('@axiomhq/nextjs', () => ({
  createAxiomRouteHandler:
    () =>
    (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
    async (req: Request, ctx: unknown) => {
      calls.push('axiom')
      return handler(req, ctx)
    },
}))

import { withAxiom } from '@/lib/axiom/server'

const statusRequest = () =>
  new Request('http://localhost/api/status') as NextRequest

beforeEach(() => {
  calls.length = 0
})

describe('withAxiom', () => {
  it('waits for a real request before the Axiom wrapper runs anything', async () => {
    const handler = vi.fn(async () => {
      calls.push('handler')
      return new Response('ok')
    })

    const response = await withAxiom(handler)(
      statusRequest(),
      {},
    )

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
