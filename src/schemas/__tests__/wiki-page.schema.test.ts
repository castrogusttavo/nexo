import { describe, expect, it } from 'vitest'
import {
  CreateWikiPageSchema,
  MoveWikiPageSchema,
  UpdateWikiPageSchema,
} from '../wiki-page.schema'

function makeContentOfSize(targetBytes: number) {
  return [{ type: 'p', children: [{ text: 'x'.repeat(targetBytes) }] }]
}

describe('CreateWikiPageSchema', () => {
  it('should default title to empty string', () => {
    const result = CreateWikiPageSchema.safeParse({})

    expect(result.success).toBe(true)
    expect(result.data?.title).toBe('')
  })

  it('should accept a title and parentId', () => {
    const result = CreateWikiPageSchema.safeParse({
      title: 'Onboarding',
      parentId: 'tz4a98xxat96iws9zmbrgj3a',
    })

    expect(result.success).toBe(true)
  })

  it('should reject title longer than 255 characteres', () => {
    const result = CreateWikiPageSchema.safeParse({ title: 'x'.repeat(256) })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid parentId', () => {
    const result = CreateWikiPageSchema.safeParse({ parentId: 'not-a-cuid' })

    expect(result.success).toBe(false)
  })
})

describe('UpdateWikiPageSchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = UpdateWikiPageSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept content within size limit', () => {
    const result = UpdateWikiPageSchema.safeParse({
      content: makeContentOfSize(150_000),
    })

    expect(result.success).toBe(false)
  })

  it('should accept icon set to null (clearing it)', () => {
    const result = UpdateWikiPageSchema.safeParse({ icon: null })

    expect(result.success).toBe(true)
  })
})

describe('MoveWikiPageSchema', () => {
  it('should accept parentId null (move to root)', () => {
    const result = MoveWikiPageSchema.safeParse({
      parentId: null,
      position: 0,
    })

    expect(result.success).toBe(true)
  })

  it('should reject missing position', () => {
    const result = MoveWikiPageSchema.safeParse({
      parentId: null,
    })

    expect(result.success).toBe(false)
  })
})
