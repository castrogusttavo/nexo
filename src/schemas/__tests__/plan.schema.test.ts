import { describe, expect, it } from 'vitest'
import {
  PlanCatalogSchema,
  PlanEntitlementsSchema,
  PlanSchema,
} from '../plan.schema'

// Minimal valid entitlements object user to exercise the shape.
const entitlements = {
  limits: {
    seats: 12,
    aiCreditsPerSeat: 500,
    guestsPerSeat: null,
    pageVersions: 20,
    pageVersionDays: 30,
  },
  features: Object.fromEntries(
    Object.keys(PlanEntitlementsSchema.shape.features.shape).map((k) => [
      k,
      false,
    ]),
  ),
  capabilities: {
    estimates: 'basic',
    views: 'basic',
    bulkOps: 'none',
    usageDashboard: 'available',
    adminControls: 'none',
    customProperties: 'none',
    teamspaces: 'none',
    dashboards: 'none',
    timeTracking: 'none',
    workflows: 'none',
    pageExports: 'none',
    roles: 'basic',
    guests: 'limited',
    supportChannels: 'basic',
  },
}

describe('PlanSchema', () => {
  it('accepts the four tiers', () => {
    for (const tier of ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']) {
      expect(PlanSchema.safeParse(tier).success).toBe(true)
    }
  })

  it('rejects the legacy BASIC tier', () => {
    expect(PlanSchema.safeParse('BASIC').success).toBe(false)
  })
})

describe('PlanEntitlementsSchema', () => {
  it('accepts a complete entitlements object', () => {
    expect(PlanEntitlementsSchema.safeParse(entitlements).success).toBe(true)
  })

  it('treats null numeric limits as valid (unlimited)', () => {
    const unlimited = {
      ...entitlements,
      limits: { ...entitlements.limits, seats: null },
    }
    expect(PlanEntitlementsSchema.safeParse(unlimited).success).toBe(true)
  })

  it('rejects a missing feature flag', () => {
    const { projects, ...features } = entitlements.features
    void projects
    const result = PlanEntitlementsSchema.safeParse({
      ...entitlements,
      features,
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown capability level', () => {
    const result = PlanEntitlementsSchema.safeParse({
      ...entitlements,
      capabilities: { ...entitlements.capabilities, roles: 'god_mode' },
    })
    expect(result.success).toBe(false)
  })
})

describe('PlanCatalogSchema', () => {
  it('requires every tier to be present', () => {
    const partial = { FREE: entitlements, PRO: entitlements }
    expect(PlanCatalogSchema.safeParse(partial).success).toBe(false)
  })
})
