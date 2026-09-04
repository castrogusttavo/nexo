import { describe, expect, it } from 'vitest'
import {
  CreateWikiCommentSchema,
  ResolveWikiCommentSchema,
  UpdateWikiCommentSchema,
} from '../wiki-comment.schema'

const content = [{ type: 'p', children: [{ text: 'x' }] }]

describe('CreateWikiCommentSchema', () => {
  it('should accept a valid payload without a parentId', () => {
    const result = CreateWikiCommentSchema.safeParse({
      markId: 'mark-1',
      content,
    })

    expect(result.success).toBe(true)
  })

  it('should accept a valid parentId', () => {
    const result = CreateWikiCommentSchema.safeParse({
      markId: 'mark-1',
      content,
      parentId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should reject an empty markId', () => {
    const result = CreateWikiCommentSchema.safeParse({ markId: '', content })

    expect(result.success).toBe(false)
  })

  it('should reject a markId longer than 64 chars', () => {
    const result = CreateWikiCommentSchema.safeParse({
      markId: 'a'.repeat(65),
      content,
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid parentId', () => {
    const result = CreateWikiCommentSchema.safeParse({
      markId: 'mark-1',
      content,
      parentId: 'not-a-cuid',
    })

    expect(result.success).toBe(false)
  })

  it('should reject content larger than 20_000 chars when stringified', () => {
    const result = CreateWikiCommentSchema.safeParse({
      markId: 'mark-1',
      content: [{ text: 'a'.repeat(20_000) }],
    })

    expect(result.success).toBe(false)
  })

  it('should reject a non-array content', () => {
    const result = CreateWikiCommentSchema.safeParse({
      markId: 'mark-1',
      content: { type: 'doc' },
    })

    expect(result.success).toBe(false)
  })
})

describe('UpdateWikiCommentSchema', () => {
  it('should accept a valid content payload', () => {
    const result = UpdateWikiCommentSchema.safeParse({ content })

    expect(result.success).toBe(true)
  })

  it('should reject a missing content', () => {
    const result = UpdateWikiCommentSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('ResolveWikiCommentSchema', () => {
  it('should accept a boolean resolved flag', () => {
    expect(ResolveWikiCommentSchema.safeParse({ resolved: true }).success).toBe(
      true,
    )
    expect(
      ResolveWikiCommentSchema.safeParse({ resolved: false }).success,
    ).toBe(true)
  })

  it('should reject a non-boolean resolved flag', () => {
    const result = ResolveWikiCommentSchema.safeParse({ resolved: 'yes' })

    expect(result.success).toBe(false)
  })

  it('should reject when resolved is missing', () => {
    const result = ResolveWikiCommentSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
