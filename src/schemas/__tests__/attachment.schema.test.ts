import { describe, expect, it } from 'vitest'
import { CreateAttachmentSchema } from '../attachment.schema'

const valid = {
  fileName: 'diagram.png',
  contentType: 'image/png',
  size: 1024,
}

describe('CreateAttachmentSchema', () => {
  it('should accept a valid attachment payload', () => {
    const result = CreateAttachmentSchema.safeParse(valid)

    expect(result.success).toBe(true)
  })

  it('should reject an empty fileName', () => {
    const result = CreateAttachmentSchema.safeParse({ ...valid, fileName: '' })

    expect(result.success).toBe(false)
  })

  it('should reject a fileName longer than 255 chars', () => {
    const result = CreateAttachmentSchema.safeParse({
      ...valid,
      fileName: 'a'.repeat(256),
    })

    expect(result.success).toBe(false)
  })

  it('should reject an empty contentType', () => {
    const result = CreateAttachmentSchema.safeParse({
      ...valid,
      contentType: '',
    })

    expect(result.success).toBe(false)
  })

  it('should reject a non-positive size', () => {
    const result = CreateAttachmentSchema.safeParse({ ...valid, size: 0 })

    expect(result.success).toBe(false)
  })

  it('should reject a non-integer size', () => {
    const result = CreateAttachmentSchema.safeParse({ ...valid, size: 1.5 })

    expect(result.success).toBe(false)
  })

  it('should reject a size above 25MB', () => {
    const result = CreateAttachmentSchema.safeParse({
      ...valid,
      size: 25 * 1024 * 1024 + 1,
    })

    expect(result.success).toBe(false)
  })
})
