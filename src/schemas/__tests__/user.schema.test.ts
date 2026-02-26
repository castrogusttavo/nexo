import { describe, expect, it } from 'vitest'
import { UpdateUserSchema } from '@/src/schemas/user.schema'

describe('UpdateUserSchema', () => {
  it('should accept valid name and email', () => {
    const result = UpdateUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'John Doe', email: 'john@example.com' })
  })

  it('should accept name only', () => {
    const result = UpdateUserSchema.safeParse({ name: 'John Doe' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'John Doe' })
  })

  it('should accept email only', () => {
    const result = UpdateUserSchema.safeParse({ email: 'john@example.com' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: 'john@example.com' })
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

  it('should reject invalid email format', () => {
    const result = UpdateUserSchema.safeParse({ email: 'not-an-email' })

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
})
