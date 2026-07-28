import { describe, expect, it } from 'vitest'
import {
  CreateModuleSchema,
  ModuleStatusSchema,
  UpdateModuleSchema,
} from '../module.schema'

describe('ModuleStatusSchema', () => {
  it('accepts every declared status', () => {
    for (const status of [
      'BACKLOG',
      'PLANNED',
      'IN_PROGRESS',
      'PAUSED',
      'COMPLETED',
      'CANCELLED',
    ]) {
      expect(ModuleStatusSchema.safeParse(status).success).toBe(true)
    }
  })

  it('rejects an unknown status', () => {
    expect(ModuleStatusSchema.safeParse('DONE').success).toBe(false)
  })
})

describe('CreateModuleSchema', () => {
  it('accepts a minimal valid payload and defaults status', () => {
    const result = CreateModuleSchema.safeParse({ name: 'Auth Module' })
    expect(result.success && result.data.status).toBe('BACKLOG')
  })

  it('accepts a full payload', () => {
    expect(
      CreateModuleSchema.safeParse({
        name: 'Auth Module',
        status: 'IN_PROGRESS',
        startDate: '2026-05-18T00:00:00Z',
        endDate: '2026-05-25T00:00:00Z',
      }).success,
    ).toBe(true)
  })

  it('rejects a name shorter than 2 characters', () => {
    expect(CreateModuleSchema.safeParse({ name: 'A' }).success).toBe(false)
  })

  it('rejects a name longer than 100 characters', () => {
    expect(
      CreateModuleSchema.safeParse({ name: 'x'.repeat(101) }).success,
    ).toBe(false)
  })
})

describe('UpdateModuleSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    expect(UpdateModuleSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a progress between 0 and 100', () => {
    expect(UpdateModuleSchema.safeParse({ progress: 50 }).success).toBe(true)
  })

  it('rejects a progress above 100', () => {
    expect(UpdateModuleSchema.safeParse({ progress: 101 }).success).toBe(false)
  })

  it('rejects a negative progress', () => {
    expect(UpdateModuleSchema.safeParse({ progress: -1 }).success).toBe(false)
  })
})
