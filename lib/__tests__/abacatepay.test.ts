import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env/server')>()
  return { ...actual, ABACATE_PAY: 'fake-key' }
})

import { AbacatePayClient } from '@/lib/abacatepay'

let fetchSpy: MockInstance<typeof fetch>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  fetchSpy.mockRestore()
})

describe('AbacatePayClient.createSubscription()', () => {
  it('should POST to /subscriptions/create with auth header and JSON body', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'bill_1',
            url: 'https://pay/c/1',
            amount: 100,
            status: 'PENDING',
            createdAt: 'now',
            updatedAt: 'now',
          },
          error: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await AbacatePayClient.createSubscription({
      items: [{ id: 'p1', quantity: 1 }],
      methods: ['CARD'],
    })

    expect(result.success).toBe(true)
    expect(result.data.id).toBe('bill_1')

    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('https://api.abacatepay.com/v2/subscriptions/create')
    expect(init?.method).toBe('POST')
    const headers = new Headers(init?.headers)
    expect(headers.get('Authorization')).toBe('Bearer fake-key')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init?.body).toContain('"id":"p1"')
  })

  it('should throw when response is not ok and surfaces error message', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, data: null, error: 'invalid plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(
      AbacatePayClient.createSubscription({
        items: [{ id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow('invalid plan')
  })

  it('should throw with status fallback when error field is missing', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      AbacatePayClient.createSubscription({
        items: [{ id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/502/)
  })
})
