import type { PlanTier } from '@/src/schemas/plan.schema'

export type BillingInterval = 'monthly' | 'yearly'
export const BILLING_INTERVALS = ['monthly', 'yearly'] as const

export interface PlanPrice {
  /** Price per month on monthly billing, in cents (BRL). */
  monthly: number
  /** Total price per year on yearly billing, in cents (BRL). */
  yearly: number
}

/**
 * Public prices per plan, in cents (BRL). `null` = no public price
 * (Enterprise / talk to sales). Single source of truth: consumed by the
 * pricing page and, eventually, by checkout validation on the backend —
 * must match the products configured in AbacatePay.
 */
export const PAID_PLAN_PRICES: Record<'PRO' | 'BUSINESS', PlanPrice> = {
  PRO: { monthly: 4302, yearly: 38715 },
  BUSINESS: { monthly: 8006, yearly: 83681 },
}

export const PLAN_PRICES: Record<PlanTier, PlanPrice | null> = {
  FREE: { monthly: 0, yearly: 0 },
  ...PAID_PLAN_PRICES,
  ENTERPRISE: null,
}
