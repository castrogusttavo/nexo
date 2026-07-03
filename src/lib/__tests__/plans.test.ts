import { describe, expect, it } from 'vitest'
import { PlanSchema } from '@/src/schemas/plan.schema'
import { can, capabilityOf, entitlementsFor, limitOf } from '../plans'

describe('plan entitlements', () => {
  it('exposes a complete entitlements object for every tier', () => {
    for (const tier of PlanSchema.options) {
      expect(() => entitlementsFor(tier)).not.toThrow()
    }
  })

  it('caps seats on FREE and leaves paid tiers unlimited', () => {
    expect(limitOf('FREE', 'seats')).toBe(12)
    expect(limitOf('PRO', 'seats')).toBeNull()
    expect(limitOf('ENTERPRISE', 'seats')).toBeNull()
  })

  it('gates features by tier (monotonic)', () => {
    expect(can('FREE', 'projects')).toBe(true) // baseline
    expect(can('FREE', 'saml')).toBe(false)
    expect(can('BUSINESS', 'saml')).toBe(true)
    expect(can('PRO', 'customSlas')).toBe(false)
    expect(can('ENTERPRISE', 'customSlas')).toBe(true)
    expect(can('BUSINESS', 'apiAuditLogs')).toBe(false)
    expect(can('ENTERPRISE', 'apiAuditLogs')).toBe(true)
    expect(can('ENTERPRISE', 'managedDeployment')).toBe(true)
  })

  it('resolves graded capabilities', () => {
    expect(capabilityOf('FREE', 'roles')).toBe('basic')
    expect(capabilityOf('PRO', 'roles')).toBe('rbac')
    expect(capabilityOf('ENTERPRISE', 'roles')).toBe('gac')
  })
})
