import { parseAsStringLiteral } from 'nuqs'
import { BILLING_INTERVALS } from '@/src/config/plan-prices'

/** Cadência de cobrança via url-state `?billing=` (client-only, nuqs). */
export const billingParser =
  parseAsStringLiteral(BILLING_INTERVALS).withDefault('yearly')

/** Plano comprável via checkout — `?plan=` (FREE/ENTERPRISE ficam de fora). */
export const planParser = parseAsStringLiteral(['PRO', 'BUSINESS'] as const)
