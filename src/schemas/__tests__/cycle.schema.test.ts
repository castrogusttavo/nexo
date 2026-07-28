import { describe, expect, it } from 'vitest'
import {
  CreateCycleSchema,
  CycleStatusSchema,
  UpdateCycleSchema,
} from '../cycle.schema'

describe('CycleStatusSchema', () => {
  it('accepts every declared status', () => {
    for (const status of ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']) {
      expect(CycleStatusSchema.safeParse(status).success).toBe(true)
    }
  })

  it('rejects an unknown status', () => {
    expect(CycleStatusSchema.safeParse('DONE').success).toBe(false)
  })
})

describe('CreateCycleSchema', () => {
  it('accepts a minimal valid payload and defaults status', () => {
    const result = CreateCycleSchema.safeParse({ name: 'Sprint 1' })
    expect(result.success && result.data.status).toBe('NOT_STARTED')
  })

  it('accepts a full payload with dates', () => {
    expect(
      CreateCycleSchema.safeParse({
        name: 'Sprint 1',
        description: 'First sprint',
        status: 'IN_PROGRESS',
        startDate: '2026-05-18T00:00:00Z',
        endDate: '2026-05-25T00:00:00Z',
      }).success,
    ).toBe(true)
  })

  it('rejects a name shorter than 2 characters', () => {
    expect(CreateCycleSchema.safeParse({ name: 'A' }).success).toBe(false)
  })

  it('rejects a description longer than 500 characters', () => {
    expect(
      CreateCycleSchema.safeParse({
        name: 'Sprint 1',
        description: 'x'.repeat(501),
      }).success,
    ).toBe(false)
  })

  it('rejects a date without timezone offset', () => {
    expect(
      CreateCycleSchema.safeParse({
        name: 'Sprint 1',
        startDate: '2026-05-18T00:00:00',
      }).success,
    ).toBe(false)
  })
})

describe('UpdateCycleSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    expect(UpdateCycleSchema.safeParse({}).success).toBe(true)
  })

  it('accepts null dates for clearing them', () => {
    expect(
      UpdateCycleSchema.safeParse({ startDate: null, endDate: null }).success,
    ).toBe(true)
  })

  it('rejects an invalid status', () => {
    expect(UpdateCycleSchema.safeParse({ status: 'ARCHIVED' }).success).toBe(
      false,
    )
  })
})
