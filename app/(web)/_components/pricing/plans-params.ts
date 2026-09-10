import { parseAsStringLiteral } from 'nuqs'
import { BILLING_INTERVALS } from '@/src/config/plan-prices'

/** Billing cadence via url-state `?billing=` (client-only, nuqs). */
export const billingParser =
  parseAsStringLiteral(BILLING_INTERVALS).withDefault('yearly')

/** Plan purchasable via checkout — `?plan=` (FREE/ENTERPRISE are excluded). */
export const planParser = parseAsStringLiteral(['PRO', 'BUSINESS'] as const)
