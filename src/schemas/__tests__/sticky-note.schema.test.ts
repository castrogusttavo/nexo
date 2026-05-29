import { describe, expect, it } from 'vitest'
import {
  CreateStickyNoteSchema,
  UpdateStickyNoteSchema,
} from '../sticky-note.schema'

const tinyDoc = { type: 'doc', content: [] }

function makeContentOfSize(targetBytes: number) {
  const text = 'x'.repeat(targetBytes)
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

describe('CreateStickyNoteSchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = CreateStickyNoteSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept valid color', () => {
    const result = CreateStickyNoteSchema.safeParse({ color: 'BLUE' })

    expect(result.success).toBe(true)
    expect(result.data?.color).toBe('BLUE')
  })

  it('should accept valid content', () => {
    const result = CreateStickyNoteSchema.safeParse({ content: tinyDoc })

    expect(result.success).toBe(true)
  })

  it('should accept color and content together', () => {
    const result = CreateStickyNoteSchema.safeParse({
      color: 'GREEN',
      content: tinyDoc,
    })

    expect(result.success).toBe(true)
  })

  it('should reject invalid color', () => {
    const result = CreateStickyNoteSchema.safeParse({ color: 'PINK' })

    expect(result.success).toBe(false)
  })

  it('should accept content within size limit', () => {
    const result = CreateStickyNoteSchema.safeParse({
      content: makeContentOfSize(50_000),
    })

    expect(result.success).toBe(true)
  })

  it('should reject content that is not an object', () => {
    const result = CreateStickyNoteSchema.safeParse({
      content: 'not an object',
    })

    expect(result.success).toBe(false)
  })

  it('should reject content larger than 100kb', () => {
    const result = CreateStickyNoteSchema.safeParse({
      content: makeContentOfSize(150_000),
    })

    expect(result.success).toBe(false)
  })
})

describe('UpdateStickyNoteSchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = UpdateStickyNoteSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept color only', () => {
    const result = UpdateStickyNoteSchema.safeParse({ color: 'RED' })

    expect(result.success).toBe(true)
  })

  it('should accept content only', () => {
    const result = UpdateStickyNoteSchema.safeParse({ content: tinyDoc })

    expect(result.success).toBe(true)
  })

  it('should reject invalid color', () => {
    const result = UpdateStickyNoteSchema.safeParse({ color: 'INVALID' })

    expect(result.success).toBe(false)
  })

  it('should reject content larger than 100kb', () => {
    const result = UpdateStickyNoteSchema.safeParse({
      content: makeContentOfSize(150_000),
    })

    expect(result.success).toBe(false)
  })
})
