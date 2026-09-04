import { describe, expect, it } from 'vitest'
import { ListActivityQuerySchema } from '../activity.schema'

describe('ListActivityQuerySchema', () => {
  it('should accept a valid entityType and entityId', () => {
    const result = ListActivityQuerySchema.safeParse({
      entityType: 'ISSUE',
      entityId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should accept every defined entity type', () => {
    for (const entityType of ['ISSUE', 'CYCLE', 'MODULE']) {
      const result = ListActivityQuerySchema.safeParse({
        entityType,
        entityId: 'tz4a98xxat96iws9zmbrgj3a',
      })
      expect(result.success, `entityType=${entityType}`).toBe(true)
    }
  })

  it('should reject an unknown entity type', () => {
    const result = ListActivityQuerySchema.safeParse({
      entityType: 'PROJECT',
      entityId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid entityId', () => {
    const result = ListActivityQuerySchema.safeParse({
      entityType: 'ISSUE',
      entityId: 'not-a-cuid',
    })

    expect(result.success).toBe(false)
  })

  it('should reject when entityId is missing', () => {
    const result = ListActivityQuerySchema.safeParse({ entityType: 'ISSUE' })

    expect(result.success).toBe(false)
  })
})
