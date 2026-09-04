import { describe, expect, it } from 'vitest'
import {
  CreateIssueTypeSchema,
  ReorderIssueTypesSchema,
  UpdateIssueTypeSchema,
} from '../issue-type.schema'

const valid = { name: 'Bug', icon: 'bug' }

describe('CreateIssueTypeSchema', () => {
  it('should accept a minimal valid payload and default the color', () => {
    const result = CreateIssueTypeSchema.safeParse(valid)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.color).toBe('ZINC')
  })

  it('should accept an explicit color and description', () => {
    const result = CreateIssueTypeSchema.safeParse({
      ...valid,
      description: 'Um problema a corrigir',
      color: 'RED',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an empty name', () => {
    const result = CreateIssueTypeSchema.safeParse({ ...valid, name: '' })

    expect(result.success).toBe(false)
  })

  it('should reject a name longer than 50 chars', () => {
    const result = CreateIssueTypeSchema.safeParse({
      ...valid,
      name: 'a'.repeat(51),
    })

    expect(result.success).toBe(false)
  })

  it('should reject a description longer than 280 chars', () => {
    const result = CreateIssueTypeSchema.safeParse({
      ...valid,
      description: 'a'.repeat(281),
    })

    expect(result.success).toBe(false)
  })

  it('should reject an empty icon', () => {
    const result = CreateIssueTypeSchema.safeParse({ ...valid, icon: '' })

    expect(result.success).toBe(false)
  })

  it('should reject an unknown color', () => {
    const result = CreateIssueTypeSchema.safeParse({
      ...valid,
      color: 'PINK',
    })

    expect(result.success).toBe(false)
  })
})

describe('UpdateIssueTypeSchema', () => {
  it('should accept an empty object (all fields optional)', () => {
    const result = UpdateIssueTypeSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept a partial payload', () => {
    const result = UpdateIssueTypeSchema.safeParse({ name: 'Renamed' })

    expect(result.success).toBe(true)
  })

  it('should still enforce field constraints when provided', () => {
    const result = UpdateIssueTypeSchema.safeParse({ name: '' })

    expect(result.success).toBe(false)
  })
})

describe('ReorderIssueTypesSchema', () => {
  it('should accept a non-empty list of ids', () => {
    const result = ReorderIssueTypesSchema.safeParse({
      typeIds: ['type-1', 'type-2'],
    })

    expect(result.success).toBe(true)
  })

  it('should reject an empty list', () => {
    const result = ReorderIssueTypesSchema.safeParse({ typeIds: [] })

    expect(result.success).toBe(false)
  })
})
