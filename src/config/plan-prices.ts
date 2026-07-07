import type { PlanTier } from '@/src/schemas/plan.schema'

export type BillingInterval = 'monthly' | 'yearly'
export const BILLING_INTERVALS = ['monthly', 'yearly'] as const

export interface PlanPrice {
  /** Preço por mês na cobrança mensal, em centavos (BRL). */
  monthly: number
  /** Preço total por ano na cobrança anual, em centavos (BRL). */
  yearly: number
}

/**
 * Preços públicos por plano, em centavos (BRL). `null` = sem preço público
 * (Enterprise / fale com vendas). Fonte única: consumida pela pricing page e,
 * futuramente, pela validação de checkout no backend — deve bater com os
 * produtos configurados no AbacatePay.
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
