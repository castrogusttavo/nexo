import { describe, expect, it } from 'vitest'
import { CreateIssueRelationSchema } from '../issue-relation.schema'

describe('CreateIssueRelationSchema', () => {
  it('should accept a valid targetId and type', () => {
    const result = CreateIssueRelationSchema.safeParse({
      targetId: 'tz4a98xxat96iws9zmbrgj3a',
      type: 'RELATES_TO',
    })

    expect(result.success).toBe(true)
  })

  it('should accept every defined relation type', () => {
    for (const type of ['RELATES_TO', 'IMPLEMENTS']) {
      const result = CreateIssueRelationSchema.safeParse({
        targetId: 'tz4a98xxat96iws9zmbrgj3a',
        type,
      })
      expect(result.success, `type=${type}`).toBe(true)
    }
  })

  it('should reject an unknown relation type', () => {
    const result = CreateIssueRelationSchema.safeParse({
      targetId: 'tz4a98xxat96iws9zmbrgj3a',
      type: 'BLOCKS',
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid targetId', () => {
    const result = CreateIssueRelationSchema.safeParse({
      targetId: 'not-a-cuid',
      type: 'RELATES_TO',
    })

    expect(result.success).toBe(false)
  })
})
