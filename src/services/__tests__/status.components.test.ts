import type { ComponentStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  COMPONENT_KEYS,
  COMPONENTS,
  COMPONENTS_BY_KEY,
  isComponentKey,
  STATUS_RANK,
  worstStatus,
} from '@/src/services/status/components'

describe('STATUS_RANK', () => {
  it('should rank statuses from operational (lowest) to major outage (highest)', () => {
    expect(STATUS_RANK.OPERATIONAL).toBe(0)
    expect(STATUS_RANK.MAINTENANCE).toBe(1)
    expect(STATUS_RANK.DEGRADED).toBe(2)
    expect(STATUS_RANK.PARTIAL_OUTAGE).toBe(3)
    expect(STATUS_RANK.MAJOR_OUTAGE).toBe(4)
  })
})

describe('worstStatus()', () => {
  it('should return OPERATIONAL when given empty array', () => {
    expect(worstStatus([])).toBe('OPERATIONAL')
  })

  it('should return the single status when only one provided', () => {
    expect(worstStatus(['DEGRADED'])).toBe('DEGRADED')
  })

  it('should pick the highest-ranked status', () => {
    expect(worstStatus(['OPERATIONAL', 'DEGRADED', 'MAINTENANCE'])).toBe(
      'DEGRADED',
    )
  })

  it('should return MAJOR_OUTAGE when present anywhere', () => {
    expect(
      worstStatus([
        'OPERATIONAL',
        'DEGRADED',
        'MAJOR_OUTAGE',
        'PARTIAL_OUTAGE',
      ]),
    ).toBe('MAJOR_OUTAGE')
  })

  it('should return PARTIAL_OUTAGE when no major outage but partial present', () => {
    const statuses: ComponentStatus[] = ['DEGRADED', 'PARTIAL_OUTAGE']
    expect(worstStatus(statuses)).toBe('PARTIAL_OUTAGE')
  })

  it('should return OPERATIONAL when all are operational', () => {
    expect(worstStatus(['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL'])).toBe(
      'OPERATIONAL',
    )
  })
})

describe('isComponentKey()', () => {
  it('should return true for known keys', () => {
    expect(isComponentKey('app')).toBe(true)
    expect(isComponentKey('database')).toBe(true)
    expect(isComponentKey('payment')).toBe(true)
  })

  it('should return false for unknown keys', () => {
    expect(isComponentKey('mystery')).toBe(false)
    expect(isComponentKey('')).toBe(false)
    expect(isComponentKey('App')).toBe(false)
  })
})

describe('COMPONENT_KEYS / COMPONENTS_BY_KEY', () => {
  it('should expose every COMPONENTS entry as a key', () => {
    expect(COMPONENT_KEYS.length).toBe(COMPONENTS.length)
    for (const def of COMPONENTS) {
      expect(COMPONENT_KEYS).toContain(def.key)
    }
  })

  it('should map keys back to their definitions', () => {
    for (const def of COMPONENTS) {
      expect(COMPONENTS_BY_KEY[def.key]).toEqual(def)
    }
  })

  it('should classify each component as core or peripheral', () => {
    for (const def of COMPONENTS) {
      expect(['core', 'peripheral']).toContain(def.tier)
    }
  })
})
