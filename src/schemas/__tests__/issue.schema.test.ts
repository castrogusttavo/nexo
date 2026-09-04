import { describe, expect, it } from 'vitest'
import {
  CreateIssueSchema,
  ListIssuesQuerySchema,
  UpdateIssueSchema,
} from '../issue.schema'

const valid = {
  title: 'Fix login bug',
  description: [],
  stateId: 'tz4a98xxat96iws9zmbrgj3a',
}

describe('CreateIssueSchema', () => {
  it('should accept a minimal valid payload and default priority', () => {
    const result = CreateIssueSchema.safeParse(valid)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.priority).toBe('NONE')
  })

  it('should accept a fully populated payload', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      priority: 'HIGH',
      startDate: '2025-03-01T10:00:00.000Z',
      dueDate: '2025-03-05T10:00:00.000Z',
      typeId: 'tz4a98xxat96iws9zmbrgj3a',
      cycleId: 'tz4a98xxat96iws9zmbrgj3a',
      moduleId: 'tz4a98xxat96iws9zmbrgj3a',
      estimateValueId: 'tz4a98xxat96iws9zmbrgj3a',
      parentId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an empty title', () => {
    const result = CreateIssueSchema.safeParse({ ...valid, title: '' })

    expect(result.success).toBe(false)
  })

  it('should reject a title longer than 255 chars', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      title: 'a'.repeat(256),
    })

    expect(result.success).toBe(false)
  })

  it('should reject description larger than 100_000 chars when stringified', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      description: [{ text: 'a'.repeat(100_000) }],
    })

    expect(result.success).toBe(false)
  })

  it('should reject a non-array description', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      description: { type: 'doc' },
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid stateId', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      stateId: 'not-a-cuid',
    })

    expect(result.success).toBe(false)
  })

  it('should reject an unknown priority', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      priority: 'CRITICAL',
    })

    expect(result.success).toBe(false)
  })

  it('should reject a startDate without a timezone offset', () => {
    const result = CreateIssueSchema.safeParse({
      ...valid,
      startDate: '2025-03-01T10:00:00',
    })

    expect(result.success).toBe(false)
  })

  it('should reject when required fields are missing', () => {
    const result = CreateIssueSchema.safeParse({ title: 'Bug' })

    expect(result.success).toBe(false)
  })
})

describe('UpdateIssueSchema', () => {
  it('should accept an empty object (all fields optional)', () => {
    const result = UpdateIssueSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept explicit nulls for nullable relation fields', () => {
    const result = UpdateIssueSchema.safeParse({
      startDate: null,
      dueDate: null,
      cycleId: null,
      moduleId: null,
      estimateValueId: null,
      parentId: null,
    })

    expect(result.success).toBe(true)
  })

  it('should still enforce field constraints when provided', () => {
    const result = UpdateIssueSchema.safeParse({ title: '' })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid cycleId when provided', () => {
    const result = UpdateIssueSchema.safeParse({ cycleId: 'not-a-cuid' })

    expect(result.success).toBe(false)
  })
})

describe('ListIssuesQuerySchema', () => {
  it('should accept an empty query', () => {
    const result = ListIssuesQuerySchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should coerce numeric strings for cursor and limit', () => {
    const result = ListIssuesQuerySchema.safeParse({
      cursor: '5',
      limit: '20',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cursor).toBe(5)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should reject a limit above 1000', () => {
    const result = ListIssuesQuerySchema.safeParse({ limit: 1001 })

    expect(result.success).toBe(false)
  })

  it('should reject a non-positive cursor', () => {
    const result = ListIssuesQuerySchema.safeParse({ cursor: 0 })

    expect(result.success).toBe(false)
  })
})
