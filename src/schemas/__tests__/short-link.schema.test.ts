import { describe, expect, it } from 'vitest'
import {
  CreateShortLinkSchema,
  UpdateShortLinkSchema,
} from '../short-link.schema'

describe('CreateShortLinkSchema', () => {
  it('should accept valid title and url', () => {
    const result = CreateShortLinkSchema.safeParse({
      title: 'My link',
      url: 'https://example.com',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      title: 'My link',
      url: 'https://example.com',
    })
  })

  it('should reject title shorter than 2 chars', () => {
    const result = CreateShortLinkSchema.safeParse({
      title: 'A',
      url: 'https://example.com',
    })

    expect(result.success).toBe(false)
  })

  it('should reject title longer than 100 chars', () => {
    const result = CreateShortLinkSchema.safeParse({
      title: 'A'.repeat(101),
      url: 'https://example.com',
    })

    expect(result.success).toBe(false)
  })

  it('should reject invalid URL', () => {
    const result = CreateShortLinkSchema.safeParse({
      title: 'Link',
      url: 'not-a-url',
    })

    expect(result.success).toBe(false)
  })

  it('should reject URL longer than 2048 chars', () => {
    const longUrl = `https://example.com/${'a'.repeat(2048)}`
    const result = CreateShortLinkSchema.safeParse({
      title: 'Link',
      url: longUrl,
    })

    expect(result.success).toBe(false)
  })

  it('should reject when title or url is missing', () => {
    expect(
      CreateShortLinkSchema.safeParse({
        title: 'Only title',
      }).success,
    ).toBe(false)
  })
})

describe('UpdateShortLinkSchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = UpdateShortLinkSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept title only', () => {
    const result = UpdateShortLinkSchema.safeParse({
      title: 'Renamed',
    })

    expect(result.success).toBe(true)
  })

  it('shoudl accept url only', () => {
    const result = UpdateShortLinkSchema.safeParse({
      url: 'https://updated.com',
    })

    expect(result.success).toBe(true)
  })

  it('should reject invalid URL', () => {
    const result = UpdateShortLinkSchema.safeParse({
      url: 'invalid',
    })

    expect(result.success).toBe(false)
  })
})
