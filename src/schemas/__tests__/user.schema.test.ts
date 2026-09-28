import { describe, expect, it } from 'vitest'
import { SaveProfileSchema, UpdateUserSchema } from '@/src/schemas/user.schema'

describe('UpdateUserSchema', () => {
  // The e-mail is deliberately not part of a profile update: this endpoint
  // wrote it straight to the row, keeping the verification flag from the old
  // address, and the platform admin list is keyed by e-mail. Anything sent
  // under that key is dropped here, before it reaches the service.
  it('should drop an email instead of applying it', () => {
    const result = UpdateUserSchema.safeParse({
      name: 'John Doe',
      email: 'admin@nexopm.com',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'John Doe' })
  })

  it('should accept name only', () => {
    const result = UpdateUserSchema.safeParse({ name: 'John Doe' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'John Doe' })
  })

  it('should turn an email-only update into a no-op', () => {
    const result = UpdateUserSchema.safeParse({ email: 'admin@nexopm.com' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
  })

  it('should accept empty object (all fields optional)', () => {
    const result = UpdateUserSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should reject name shorter than 2 characters', () => {
    const result = UpdateUserSchema.safeParse({ name: 'A' })

    expect(result.success).toBe(false)
  })

  it('should reject name longer than 100 characters', () => {
    const result = UpdateUserSchema.safeParse({ name: 'A'.repeat(101) })

    expect(result.success).toBe(false)
  })

  it('should accept name with exactly 2 characters', () => {
    const result = UpdateUserSchema.safeParse({ name: 'AB' })

    expect(result.success).toBe(true)
  })

  it('should accept name with exactly 100 characters', () => {
    const result = UpdateUserSchema.safeParse({ name: 'A'.repeat(100) })

    expect(result.success).toBe(true)
  })

  it('should accept a valid username', () => {
    const result = UpdateUserSchema.safeParse({ username: 'john.doe_01' })

    expect(result.success).toBe(true)
  })

  it('should reject a username shorter than 3 characters', () => {
    const result = UpdateUserSchema.safeParse({ username: 'ab' })

    expect(result.success).toBe(false)
  })

  it('should reject a username longer than 39 characters', () => {
    const result = UpdateUserSchema.safeParse({ username: 'a'.repeat(40) })

    expect(result.success).toBe(false)
  })

  it('should reject a username with uppercase or invalid characters', () => {
    expect(UpdateUserSchema.safeParse({ username: 'John' }).success).toBe(false)
    expect(UpdateUserSchema.safeParse({ username: 'jo hn' }).success).toBe(
      false,
    )
    expect(UpdateUserSchema.safeParse({ username: 'joão' }).success).toBe(false)
  })

  it('should accept a coverImage as a relative path', () => {
    const result = UpdateUserSchema.safeParse({ coverImage: '/covers/1.jpg' })

    expect(result.success).toBe(true)
  })

  it('should accept a coverImage as an absolute URL', () => {
    const result = UpdateUserSchema.safeParse({
      coverImage: 'https://cdn.example.com/c.jpg',
    })

    expect(result.success).toBe(true)
  })

  it('should reject a coverImage that is neither a path nor a URL', () => {
    const result = UpdateUserSchema.safeParse({ coverImage: 'not-a-url' })

    expect(result.success).toBe(false)
  })
})

describe('SaveProfileSchema', () => {
  it('treats a missing marketing choice as no consent', () => {
    const result = SaveProfileSchema.parse({ name: 'Ana' })

    expect(result.marketingConsent).toBe(false)
  })

  it('keeps an explicit opt-in', () => {
    const result = SaveProfileSchema.parse({
      name: 'Ana',
      marketingConsent: true,
    })

    expect(result.marketingConsent).toBe(true)
  })
})
