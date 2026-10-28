import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { useLogger } from '@/lib/axiom/client'
import { captureEvent } from '@/lib/posthog/client'
import { ApiError, apiFetch, apiFetchJson } from '@/src/hooks/_fetch'
import {
  PAID_PLAN_PRICES,
  yearlyDiscount,
} from '../(web)/_components/pricing/plans'
import {
  billingParser,
  planParser,
} from '../(web)/_components/pricing/plans-params'

type AppliedCoupon = {
  code: string
  discount: number
  discountKind: 'PERCENTAGE' | 'FIXED'
}

const CHECKOUT_FAILED = 'Não foi possível iniciar o pagamento'

export function useUpgradeCheckout(workspaces: { id: string }[]) {
  const log = useLogger()
  const [plan, setPlan] = useQueryState('plan', planParser)
  const [billing, setBilling] = useQueryState('billing', billingParser)
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    workspaces[0]?.id ?? null,
  )

  const [seats, setSeats] = useState(1)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponPending, setCouponPending] = useState(false)

  const price = plan ? PAID_PLAN_PRICES[plan] : null
  const total = price
    ? (billing === 'yearly' ? price.yearly : price.monthly) * seats
    : 0
  const discount = price ? yearlyDiscount(price) : 0
  const savings = price ? (price.monthly * 12 - price.yearly) * seats : 0
  const maxDiscount = Math.max(
    yearlyDiscount(PAID_PLAN_PRICES.PRO),
    yearlyDiscount(PAID_PLAN_PRICES.BUSINESS),
  )

  const couponDiscount =
    appliedCoupon && total > 0
      ? appliedCoupon.discountKind === 'PERCENTAGE'
        ? Math.round((total * appliedCoupon.discount) / 100)
        : Math.min(total, appliedCoupon.discount)
      : 0
  const finalTotal = Math.max(0, total - couponDiscount)

  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setCouponError(null)
    setCouponPending(true)

    try {
      const validated = await apiFetch<AppliedCoupon | null>(
        `/api/coupons/validate?code=${encodeURIComponent(code)}`,
        undefined,
        'Cupom inválido',
      )
      if (!validated) throw new ApiError('Cupom inválido')
      setAppliedCoupon(validated)
      setCouponInput(validated.code)
    } catch (err) {
      // The server refused the code: say why and drop the coupon.
      if (err instanceof ApiError) {
        setAppliedCoupon(null)
        setCouponError(err.message)
        return
      }
      setCouponError('Não foi possível validar o cupom')
      log.error('upgrade.coupon_failed', {
        component: 'UpgradeForm',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setCouponPending(false)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  async function handleCheckout() {
    if (!plan || !workspaceId) return
    setError(null)
    setIsPending(true)

    // Fired here, on the screen where the data is filled in, not on the
    // webhook: the webhook has no browser, and capturing it server-side would
    // mean analytics outside the consent the banner asks for. The trade is
    // explicit — someone who closes the tab mid-payment is missing here, and
    // present in the database, which is where revenue is counted anyway.
    captureEvent('checkout_started', { plan, interval: billing, seats })

    try {
      const order = await apiFetchJson<{ paymentUrl?: string } | null>(
        '/api/payment/plan',
        'POST',
        {
          plan,
          workspaceId,
          seats,
          interval: billing,
          ...(appliedCoupon ? { coupon: appliedCoupon.code } : {}),
        },
        CHECKOUT_FAILED,
      )
      if (!order?.paymentUrl) throw new ApiError(CHECKOUT_FAILED)
      window.location.href = order.paymentUrl
    } catch (err) {
      // A refused order carries the server's reason; only a failed request
      // is worth a log.
      if (err instanceof ApiError) {
        setError(err.message)
        return
      }
      setError(CHECKOUT_FAILED)
      log.error('upgrade.checkout_failed', {
        component: 'UpgradeForm',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsPending(false)
    }
  }

  return {
    plan,
    setPlan,
    billing,
    setBilling,
    workspaceId,
    setWorkspaceId,
    seats,
    setSeats,
    isPending,
    error,
    price,
    total,
    discount,
    savings,
    maxDiscount,
    couponInput,
    setCouponInput,
    appliedCoupon,
    couponError,
    setCouponError,
    couponPending,
    couponDiscount,
    finalTotal,
    applyCoupon,
    removeCoupon,
    handleCheckout,
  } as const
}

export type UpgradeCheckout = ReturnType<typeof useUpgradeCheckout>
