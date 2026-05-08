import { describe, expect, it } from 'vitest'
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from '@/src/schemas/workspace.schema'

describe('CreateWorkspaceSchema', () => {
  it('should accept valid name and slug', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'Acme',
      slug: 'acme-co',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'Acme', slug: 'acme-co' })
  })

  it('should accept slug with digits and hyphens', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'Acme',
      slug: 'acme-2025',
    })

    expect(result.success).toBe(true)
  })

  it('should reject slug with uppercase letters', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'Acme',
      slug: 'Acme',
    })

    expect(result.success).toBe(false)
  })

  it('should reject slug with spaces', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'Acme',
      slug: 'acme co',
    })

    expect(result.success).toBe(false)
  })

  it('should reject slug with underscores', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'Acme',
      slug: 'acme_co',
    })

    expect(result.success).toBe(false)
  })

  it('should reject name shorter than 2 chars', () => {
    const result = CreateWorkspaceSchema.safeParse({ name: 'A', slug: 'acme' })

    expect(result.success).toBe(false)
  })

  it('should reject slug shorter than 2 chars', () => {
    const result = CreateWorkspaceSchema.safeParse({ name: 'Acme', slug: 'a' })

    expect(result.success).toBe(false)
  })

  it('should reject slug longer than 50 chars', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'Acme',
      slug: 'a'.repeat(51),
    })

    expect(result.success).toBe(false)
  })

  it('should reject name longer than 100 chars', () => {
    const result = CreateWorkspaceSchema.safeParse({
      name: 'A'.repeat(101),
      slug: 'acme',
    })

    expect(result.success).toBe(false)
  })

  it('should reject when name or slug is missing', () => {
    expect(CreateWorkspaceSchema.safeParse({ name: 'Acme' }).success).toBe(
      false,
    )
    expect(CreateWorkspaceSchema.safeParse({ slug: 'acme' }).success).toBe(
      false,
    )
  })
})

describe('UpdateWorkspaceSchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = UpdateWorkspaceSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should accept name only', () => {
    const result = UpdateWorkspaceSchema.safeParse({ name: 'New' })

    expect(result.success).toBe(true)
  })

  it('should accept slug only', () => {
    const result = UpdateWorkspaceSchema.safeParse({ slug: 'new-slug' })

    expect(result.success).toBe(true)
  })

  it('should reject invalid slug pattern', () => {
    const result = UpdateWorkspaceSchema.safeParse({ slug: 'INVALID' })

    expect(result.success).toBe(false)
  })
})
