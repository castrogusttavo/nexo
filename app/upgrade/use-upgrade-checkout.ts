import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { useLogger } from '@/lib/axiom/client'
import {
  PAID_PLAN_PRICES,
  yearlyDiscount,
} from '../(web)/_components/pricing/plans'
import {
  billingParser,
  planParser,
} from '../(web)/_components/pricing/plans-params'

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
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    discountKind: 'PERCENTAGE' | 'FIXED'
  } | null>(null)
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
      const response = await fetch(
        `/api/coupons/validate?code=${encodeURIComponent(code)}`,
      )
      const result = await response.json()

      if (result.success && result.data) {
        setAppliedCoupon(result.data)
        setCouponInput(result.data.code)
      } else {
        setAppliedCoupon(null)
        setCouponError(result.error?.message ?? 'Cupom inválido')
      }
    } catch (err) {
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

    try {
      const response = await fetch('/api/payment/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          workspaceId,
          seats,
          interval: billing,
          ...(appliedCoupon ? { coupon: appliedCoupon.code } : {}),
        }),
      })
      const result = await response.json()

      if (result.success && result.data?.paymentUrl) {
        window.location.href = result.data.paymentUrl
        return
      }
      setError(result.error?.message ?? 'Não foi possível iniciar o pagamento')
    } catch (err) {
      setError('Não foi possível iniciar o pagamento')
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
