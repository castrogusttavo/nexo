import { describe, expect, it } from 'vitest'
import { CreateCommentSchema, UpdateCommentSchema } from '../comment.schema'

const content = { type: 'doc', content: [] }

describe('CreateCommentSchema', () => {
  it('should accept a valid content payload without a parentId', () => {
    const result = CreateCommentSchema.safeParse({ content })

    expect(result.success).toBe(true)
  })

  it('should accept a valid parentId', () => {
    const result = CreateCommentSchema.safeParse({
      content,
      parentId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an invalid parentId', () => {
    const result = CreateCommentSchema.safeParse({
      content,
      parentId: 'not-a-cuid',
    })

    expect(result.success).toBe(false)
  })

  it('should reject content larger than 100_000 chars when stringified', () => {
    const result = CreateCommentSchema.safeParse({
      content: { type: 'doc', text: 'a'.repeat(100_000) },
    })

    expect(result.success).toBe(false)
  })

  it('should reject a non-object content', () => {
    const result = CreateCommentSchema.safeParse({ content: 'plain string' })

    expect(result.success).toBe(false)
  })
})

describe('UpdateCommentSchema', () => {
  it('should accept a valid content payload', () => {
    const result = UpdateCommentSchema.safeParse({ content })

    expect(result.success).toBe(true)
  })

  it('should reject a missing content', () => {
    const result = UpdateCommentSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
