import { act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import { useUpgradeCheckout } from '../use-upgrade-checkout'

const { logError } = vi.hoisted(() => ({ logError: vi.fn() }))
vi.mock('@/lib/axiom/client', () => ({
  useLogger: () => ({ error: logError }),
}))

// PRO: R$ 43,02/month or R$ 387,15/year (cents) — see src/config/plan-prices.
const PRO_MONTHLY = 4302
const PRO_YEARLY = 38715

const WORKSPACES = [{ id: 'ws-1' }, { id: 'ws-2' }]

function renderCheckout(
  searchParams: Record<string, string> = { plan: 'PRO' },
  workspaces = WORKSPACES,
) {
  return renderHookWithProviders(() => useUpgradeCheckout(workspaces), {
    searchParams,
  })
}

function coupon(
  discountKind: 'PERCENTAGE' | 'FIXED',
  discount: number,
  code = 'PROMO10',
) {
  return { code, discount, discountKind }
}

async function applyCoupon(
  result: { current: ReturnType<typeof useUpgradeCheckout> },
  input: string,
) {
  act(() => result.current.setCouponInput(input))
  await act(() => result.current.applyCoupon())
}

describe('useUpgradeCheckout', () => {
  describe('pricing', () => {
    it('reads plan and billing from the URL, defaulting to yearly', () => {
      const { result } = renderCheckout()

      expect(result.current.plan).toBe('PRO')
      expect(result.current.billing).toBe('yearly')
      expect(result.current.total).toBe(PRO_YEARLY)
      expect(result.current.finalTotal).toBe(PRO_YEARLY)
    })

    it('prices monthly billing per seat', () => {
      const { result } = renderCheckout({ plan: 'PRO', billing: 'monthly' })

      act(() => result.current.setSeats(3))

      expect(result.current.total).toBe(PRO_MONTHLY * 3)
    })

    it('reports the yearly savings and discount for the selected plan', () => {
      const { result } = renderCheckout()

      act(() => result.current.setSeats(2))

      expect(result.current.savings).toBe((PRO_MONTHLY * 12 - PRO_YEARLY) * 2)
      expect(result.current.discount).toBeCloseTo(
        (PRO_MONTHLY - PRO_YEARLY / 12) / PRO_MONTHLY,
      )
    })

    it('has no price without a valid plan', () => {
      const { result } = renderCheckout({ plan: 'ENTERPRISE' })

      expect(result.current.plan).toBeNull()
      expect(result.current.price).toBeNull()
      expect(result.current.total).toBe(0)
    })

    it('preselects the first workspace', () => {
      const { result } = renderCheckout()

      expect(result.current.workspaceId).toBe('ws-1')
    })
  })

  describe('coupons', () => {
    it('validates the trimmed, encoded code and applies a percentage discount', async () => {
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess(coupon('PERCENTAGE', 10, 'PROMO 10')),
      )
      const { result } = renderCheckout()

      await applyCoupon(result, '  promo 10 ')

      expect(getFetchCall(fetchSpy).url).toBe(
        '/api/coupons/validate?code=promo%2010',
      )
      expect(result.current.appliedCoupon?.code).toBe('PROMO 10')
      // Input is normalized to the server's canonical code.
      expect(result.current.couponInput).toBe('PROMO 10')
      expect(result.current.couponDiscount).toBe(Math.round(PRO_YEARLY / 10))
      expect(result.current.finalTotal).toBe(
        PRO_YEARLY - Math.round(PRO_YEARLY / 10),
      )
      expect(result.current.couponPending).toBe(false)
    })

    it('applies a fixed discount without going below zero', async () => {
      mockFetch().mockResolvedValueOnce(
        apiSuccess(coupon('FIXED', PRO_YEARLY + 10_000)),
      )
      const { result } = renderCheckout()

      await applyCoupon(result, 'BIG')

      expect(result.current.couponDiscount).toBe(PRO_YEARLY)
      expect(result.current.finalTotal).toBe(0)
    })

    it('does not call the API for a blank code', async () => {
      const fetchSpy = mockFetch()
      const { result } = renderCheckout()

      await applyCoupon(result, '   ')

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('shows an error and clears the coupon when validation fails', async () => {
      mockFetch()
        .mockResolvedValueOnce(apiSuccess(coupon('PERCENTAGE', 10)))
        .mockResolvedValueOnce(apiError(404, 'Cupom expirado', 'NOT_FOUND'))
      const { result } = renderCheckout()
      await applyCoupon(result, 'PROMO10')

      await applyCoupon(result, 'EXPIRED')

      expect(result.current.appliedCoupon).toBeNull()
      expect(result.current.couponError).toBe('Cupom expirado')
      expect(result.current.finalTotal).toBe(PRO_YEARLY)
    })

    it('falls back to a generic message when the API sends none', async () => {
      mockFetch().mockResolvedValueOnce(apiError(404))
      const { result } = renderCheckout()

      await applyCoupon(result, 'EXPIRED')

      expect(result.current.couponError).toBe('Cupom inválido')
    })

    it('reports a network failure and logs it', async () => {
      mockFetch().mockRejectedValueOnce(new Error('offline'))
      const { result } = renderCheckout()

      await applyCoupon(result, 'PROMO10')

      expect(result.current.couponError).toBe(
        'Não foi possível validar o cupom',
      )
      expect(result.current.couponPending).toBe(false)
      expect(logError).toHaveBeenCalledWith(
        'upgrade.coupon_failed',
        expect.objectContaining({ message: 'offline' }),
      )
    })

    it('removes an applied coupon', async () => {
      mockFetch().mockResolvedValueOnce(apiSuccess(coupon('PERCENTAGE', 10)))
      const { result } = renderCheckout()
      await applyCoupon(result, 'PROMO10')

      act(() => result.current.removeCoupon())

      expect(result.current.appliedCoupon).toBeNull()
      expect(result.current.couponInput).toBe('')
      expect(result.current.couponError).toBeNull()
      expect(result.current.finalTotal).toBe(PRO_YEARLY)
    })
  })

  describe('checkout', () => {
    // jsdom cannot navigate to another document, so the "payment URL" is a
    // same-document hash link — assigning it still proves the redirect.
    let paymentUrl: string

    beforeEach(() => {
      paymentUrl = `${window.location.origin}${window.location.pathname}#abacatepay-checkout`
    })

    afterEach(() => {
      window.location.hash = ''
    })

    it('posts the order and redirects to the payment page', async () => {
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess({ paymentUrl }),
      )
      const { result } = renderCheckout({
        plan: 'BUSINESS',
        billing: 'monthly',
      })
      act(() => {
        result.current.setWorkspaceId('ws-2')
        result.current.setSeats(4)
      })

      await act(() => result.current.handleCheckout())

      expect(getFetchCall(fetchSpy)).toEqual({
        url: '/api/payment/plan',
        method: 'POST',
        body: {
          plan: 'BUSINESS',
          workspaceId: 'ws-2',
          seats: 4,
          interval: 'monthly',
        },
      })
      expect(window.location.href).toBe(paymentUrl)
      expect(result.current.error).toBeNull()
    })

    it('sends the applied coupon code with the order', async () => {
      const fetchSpy = mockFetch()
        .mockResolvedValueOnce(apiSuccess(coupon('PERCENTAGE', 10)))
        .mockResolvedValueOnce(apiSuccess({ paymentUrl }))
      const { result } = renderCheckout()
      await applyCoupon(result, 'promo10')

      await act(() => result.current.handleCheckout())

      expect(getFetchCall(fetchSpy, 1).body).toMatchObject({
        coupon: 'PROMO10',
      })
    })

    it('flags the checkout as pending while the request is in flight', async () => {
      let resolveFetch: (res: Response) => void = () => {}
      mockFetch().mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
      )
      const { result } = renderCheckout()

      let checkout: Promise<void> = Promise.resolve()
      act(() => {
        checkout = result.current.handleCheckout()
      })
      await waitFor(() => expect(result.current.isPending).toBe(true))

      await act(async () => {
        resolveFetch(apiError(500))
        await checkout
      })
      expect(result.current.isPending).toBe(false)
    })

    it("shows the API's message when the checkout is rejected", async () => {
      mockFetch().mockResolvedValueOnce(apiError(400, 'Plano inválido'))
      const { result } = renderCheckout()

      await act(() => result.current.handleCheckout())

      expect(result.current.error).toBe('Plano inválido')
    })

    it('shows an error when the API does not return a payment URL', async () => {
      mockFetch().mockResolvedValueOnce(apiError(400))
      const { result } = renderCheckout()

      await act(() => result.current.handleCheckout())

      expect(result.current.error).toBe('Não foi possível iniciar o pagamento')
      expect(result.current.isPending).toBe(false)
      expect(window.location.hash).toBe('')
    })

    it('shows an error and logs when the request fails', async () => {
      mockFetch().mockRejectedValueOnce(new Error('network down'))
      const { result } = renderCheckout()

      await act(() => result.current.handleCheckout())

      expect(result.current.error).toBe('Não foi possível iniciar o pagamento')
      expect(logError).toHaveBeenCalledWith(
        'upgrade.checkout_failed',
        expect.objectContaining({ message: 'network down' }),
      )
    })

    it('does nothing without a plan', async () => {
      const fetchSpy = mockFetch()
      const { result } = renderCheckout({})

      await act(() => result.current.handleCheckout())

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does nothing without a workspace', async () => {
      const fetchSpy = mockFetch()
      const { result } = renderCheckout({ plan: 'PRO' }, [])

      await act(() => result.current.handleCheckout())

      expect(result.current.workspaceId).toBeNull()
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
