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

describe('AbacatePayClient.getCoupon()', () => {
  it('should GET the coupon and return its data', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'PROMO10',
            discount: 10,
            discountKind: 'PERCENTAGE',
            status: 'ACTIVE',
            redeemsCount: 1,
            maxRedeems: 100,
          },
          error: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const coupon = await AbacatePayClient.getCoupon('PROMO10')

    expect(coupon?.id).toBe('PROMO10')
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('https://api.abacatepay.com/v2/coupons/get?id=PROMO10')
    const headers = new Headers(init?.headers)
    expect(headers.get('Authorization')).toBe('Bearer fake-key')
  })

  it('should return null on 404', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }))

    const coupon = await AbacatePayClient.getCoupon('NOPE')

    expect(coupon).toBeNull()
  })

  it('should throw when the response is not ok and surfaces the error message', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid coupon' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(AbacatePayClient.getCoupon('BAD')).rejects.toThrow(
      'invalid coupon',
    )
  })

  it('should throw with a status fallback when the error field is missing', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 503 }),
    )

    await expect(AbacatePayClient.getCoupon('BAD')).rejects.toThrow(/503/)
  })

  it('should URL-encode the coupon code', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'A B',
            discount: 5,
            discountKind: 'FIXED',
            status: 'ACTIVE',
            redeemsCount: 0,
            maxRedeems: -1,
          },
          error: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await AbacatePayClient.getCoupon('A B')

    const [url] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('https://api.abacatepay.com/v2/coupons/get?id=A%20B')
  })
})
