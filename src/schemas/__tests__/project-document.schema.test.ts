import { describe, expect, it } from 'vitest'
import { UpdateProjectDocumentSchema } from '../project-document.schema'

describe('UpdateProjectDocumentSchema', () => {
  it('should accept a Plate value', () => {
    const result = UpdateProjectDocumentSchema.safeParse({
      content: [{ type: 'p', children: [{ text: 'oi' }] }],
    })
    expect(result.success).toBe(true)
  })

  it('should accept an empty document', () => {
    expect(UpdateProjectDocumentSchema.safeParse({ content: [] }).success).toBe(
      true,
    )
  })

  it('should require content', () => {
    expect(UpdateProjectDocumentSchema.safeParse({}).success).toBe(false)
  })

  it('should reject a non-array content', () => {
    expect(
      UpdateProjectDocumentSchema.safeParse({ content: 'texto' }).success,
    ).toBe(false)
  })

  it('should reject content above the size limit', () => {
    const big = [{ type: 'p', children: [{ text: 'a'.repeat(100_001) }] }]
    expect(
      UpdateProjectDocumentSchema.safeParse({ content: big }).success,
    ).toBe(false)
  })
})
