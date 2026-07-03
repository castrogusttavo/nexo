import { PLAN_CATALOG } from '../config/plans'
import type {
  PlanCapabilityKey,
  PlanEntitlements,
  PlanFeatureKey,
  PlanLimitKey,
  PlanTier,
} from '../schemas/plan.schema'

export function entitlementsFor(plan: PlanTier): PlanEntitlements {
  return PLAN_CATALOG[plan]
}

// Boolean feature gate - 'can(FREE, 'saml') === false'
export function can(plan: PlanTier, feature: PlanFeatureKey): boolean {
  return PLAN_CATALOG[plan].features[feature]
}

// Numeric cap - return 'null' when unlimited
export function limitOf(plan: PlanTier, key: PlanLimitKey): number | null {
  return PLAN_CATALOG[plan].limits[key]
}

// Graded capability level - e.g. 'capabilityOf('ENTERPRISE', 'roles') === 'gac''
export function capabilityOf<K extends PlanCapabilityKey>(
  plan: PlanTier,
  key: K,
): PlanEntitlements['capabilities'][K] {
  return PLAN_CATALOG[plan].capabilities[key]
}
