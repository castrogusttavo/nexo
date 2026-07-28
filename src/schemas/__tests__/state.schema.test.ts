import { describe, expect, it } from 'vitest'
import {
  CreateStateSchema,
  StateGroupSchema,
  UpdateStateSchema,
} from '../state.schema'

describe('StateGroupSchema', () => {
  it('accepts every declared group', () => {
    for (const group of [
      'BACKLOG',
      'UNSTARTED',
      'STARTED',
      'COMPLETED',
      'CANCELLED',
    ]) {
      expect(StateGroupSchema.safeParse(group).success).toBe(true)
    }
  })

  it('rejects an unknown group', () => {
    expect(StateGroupSchema.safeParse('ARCHIVED').success).toBe(false)
  })
})

describe('CreateStateSchema', () => {
  it('accepts a minimal valid payload and defaults color', () => {
    const result = CreateStateSchema.safeParse({
      name: 'Todo',
      group: 'UNSTARTED',
    })
    expect(result.success && result.data.color).toBe('ZINC')
  })

  it('accepts a full payload', () => {
    expect(
      CreateStateSchema.safeParse({
        name: 'Todo',
        description: 'Not started yet',
        group: 'UNSTARTED',
        color: 'BLUE',
      }).success,
    ).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(
      CreateStateSchema.safeParse({ name: '', group: 'UNSTARTED' }).success,
    ).toBe(false)
  })

  it('rejects a description longer than 280 characters', () => {
    expect(
      CreateStateSchema.safeParse({
        name: 'Todo',
        group: 'UNSTARTED',
        description: 'x'.repeat(281),
      }).success,
    ).toBe(false)
  })

  it('rejects a missing group', () => {
    expect(CreateStateSchema.safeParse({ name: 'Todo' }).success).toBe(false)
  })
})

describe('UpdateStateSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    expect(UpdateStateSchema.safeParse({}).success).toBe(true)
  })

  it('accepts an order override', () => {
    expect(UpdateStateSchema.safeParse({ order: 3 }).success).toBe(true)
  })

  it('rejects an invalid color', () => {
    expect(UpdateStateSchema.safeParse({ color: 'ORANGE' }).success).toBe(false)
  })
})
