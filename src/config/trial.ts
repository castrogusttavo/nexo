import type { PlanTier } from '../schemas/plan.schema'

export const TRIAL_PLAN: PlanTier = 'BUSINESS'

export const TRIAL_DAYS = 14

export function trialEndsAtFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
}
