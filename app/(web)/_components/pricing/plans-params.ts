import { parseAsStringLiteral } from 'nuqs'
import { BILLING_INTERVALS } from '@/src/config/plan-prices'

/** What /pricing shows before (and without) a `?billing=` in the URL. */
export const DEFAULT_BILLING = 'yearly' as const

/**
 * Billing cadence via url-state `?billing=` (client-only, nuqs). Reading it
 * suspends while the page prerenders, so every reader sits in its own
 * <Suspense> whose fallback renders DEFAULT_BILLING: without one the nearest
 * boundary is the root layout's, and the whole page bailed out to client
 * rendering (the server HTML stayed hidden until JavaScript ran).
 */
export const billingParser =
  parseAsStringLiteral(BILLING_INTERVALS).withDefault(DEFAULT_BILLING)

/** Plan purchasable via checkout — `?plan=` (FREE/ENTERPRISE are excluded). */
export const planParser = parseAsStringLiteral(['PRO', 'BUSINESS'] as const)
