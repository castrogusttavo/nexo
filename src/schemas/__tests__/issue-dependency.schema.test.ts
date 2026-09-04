import { describe, expect, it } from 'vitest'
import { CreateIssueDependencySchema } from '../issue-dependency.schema'

describe('CreateIssueDependencySchema', () => {
  it('should accept a valid targetId and type', () => {
    const result = CreateIssueDependencySchema.safeParse({
      targetId: 'tz4a98xxat96iws9zmbrgj3a',
      type: 'BLOCKS',
    })

    expect(result.success).toBe(true)
  })

  it('should accept every defined dependency type', () => {
    for (const type of ['BLOCKS', 'STARTS_BEFORE', 'FINISHES_BEFORE']) {
      const result = CreateIssueDependencySchema.safeParse({
        targetId: 'tz4a98xxat96iws9zmbrgj3a',
        type,
      })
      expect(result.success, `type=${type}`).toBe(true)
    }
  })

  it('should reject an unknown dependency type', () => {
    const result = CreateIssueDependencySchema.safeParse({
      targetId: 'tz4a98xxat96iws9zmbrgj3a',
      type: 'RELATES_TO',
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid targetId', () => {
    const result = CreateIssueDependencySchema.safeParse({
      targetId: 'not-a-cuid',
      type: 'BLOCKS',
    })

    expect(result.success).toBe(false)
  })
})
