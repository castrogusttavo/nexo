import type { PlanTier } from '../schemas/plan.schema'

export const TRIAL_PLAN: PlanTier = 'BUSINESS'

export const TRIAL_DAYS = 14

export function trialEndsAtFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
}

export const TRIAL_EXPIRY_CRON = '0 * * * *'

/** Dias antes do fim do trial em que o banner de promoção passa a aparecer. */
export const TRIAL_BANNER_DAYS = 5
