import { describe, expect, it } from 'vitest'
import { AddIssueLabelSchema } from '../issue-label.schema'

describe('AddIssueLabelSchema', () => {
  it('should accept a valid labelId', () => {
    const result = AddIssueLabelSchema.safeParse({
      labelId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an invalid labelId', () => {
    const result = AddIssueLabelSchema.safeParse({ labelId: 'not-a-cuid' })

    expect(result.success).toBe(false)
  })

  it('should reject when labelId is missing', () => {
    const result = AddIssueLabelSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
