import { describe, expect, it } from 'vitest'
import { CreateLabelSchema, UpdateLabelSchema } from '../label.schema'

describe('CreateLabelSchema', () => {
  it('accepts a minimal valid payload and defaults color', () => {
    const result = CreateLabelSchema.safeParse({ name: 'Bug' })
    expect(result.success && result.data.color).toBe('ZINC')
  })

  it('accepts a full payload', () => {
    expect(
      CreateLabelSchema.safeParse({
        name: 'Bug',
        description: 'Something is broken',
        color: 'RED',
      }).success,
    ).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(CreateLabelSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects a name longer than 50 characters', () => {
    expect(CreateLabelSchema.safeParse({ name: 'x'.repeat(51) }).success).toBe(
      false,
    )
  })

  it('rejects a description longer than 280 characters', () => {
    expect(
      CreateLabelSchema.safeParse({
        name: 'Bug',
        description: 'x'.repeat(281),
      }).success,
    ).toBe(false)
  })

  it('rejects an invalid color', () => {
    expect(
      CreateLabelSchema.safeParse({ name: 'Bug', color: 'ORANGE' }).success,
    ).toBe(false)
  })
})

describe('UpdateLabelSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    expect(UpdateLabelSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a partial update', () => {
    expect(UpdateLabelSchema.safeParse({ color: 'GREEN' }).success).toBe(true)
  })
})
