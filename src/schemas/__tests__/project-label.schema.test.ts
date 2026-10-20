import { describe, expect, it } from 'vitest'
import {
  CreateProjectLabelSchema,
  UpdateProjectLabelSchema,
} from '../project-label.schema'

describe('CreateProjectLabelSchema', () => {
  it('accepts a minimal valid payload and defaults color', () => {
    const result = CreateProjectLabelSchema.safeParse({ name: 'Marketing' })
    expect(result.success && result.data.color).toBe('ZINC')
  })

  it('accepts a full payload', () => {
    expect(
      CreateProjectLabelSchema.safeParse({
        name: 'Marketing',
        description: 'Projetos do time de marketing',
        color: 'YELLOW',
      }).success,
    ).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(CreateProjectLabelSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects a name longer than 50 characters', () => {
    expect(
      CreateProjectLabelSchema.safeParse({ name: 'x'.repeat(51) }).success,
    ).toBe(false)
  })

  it('rejects a description longer than 280 characters', () => {
    expect(
      CreateProjectLabelSchema.safeParse({
        name: 'Marketing',
        description: 'x'.repeat(281),
      }).success,
    ).toBe(false)
  })

  it('rejects an invalid color', () => {
    expect(
      CreateProjectLabelSchema.safeParse({ name: 'Marketing', color: 'PINK' })
        .success,
    ).toBe(false)
  })
})

describe('UpdateProjectLabelSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(UpdateProjectLabelSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a color change alone', () => {
    expect(UpdateProjectLabelSchema.safeParse({ color: 'GREEN' }).success).toBe(
      true,
    )
  })

  it('rejects an empty name', () => {
    expect(UpdateProjectLabelSchema.safeParse({ name: '' }).success).toBe(false)
  })
})
