import { describe, expect, it } from 'vitest'
import {
  CreateProjectSchema,
  ListProjectsSchema,
  UpdateProjectSchema,
} from '../project.schema'

describe('CreateProjectSchema', () => {
  it('should accept minimal valid input', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'My Project',
      slug: 'my-project',
    })

    expect(result.success).toBe(true)
    expect(result.data?.isPublic).toBe(false)
  })

  it('should default isPublic to false when omitted', () => {
    const valid = CreateProjectSchema.safeParse({ name: 'Proj', slug: 'proj' })
    expect(valid.data?.isPublic).toBe(false)
  })

  it('should accept all optional fields', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'My Project',
      slug: 'my-project',
      description: 'This is a project',
      emoji: '📝',
      coverImage: 'https://example.com/cover.jpg',
      isPublic: true,
    })

    expect(result.success).toBe(true)
  })

  it('should reject when name is missing', () => {
    const result = CreateProjectSchema.safeParse({ slug: 'my-project' })
    expect(result.success).toBe(false)
  })

  it('should reject when name is missing', () => {
    const result = CreateProjectSchema.safeParse({ slug: 'myproj' })
    expect(result.success).toBe(false)
  })

  it('should reject when slug is missing', () => {
    const result = CreateProjectSchema.safeParse({ name: 'My Project' })
    expect(result.success).toBe(false)
  })

  it('should reject name shorter than 2 chars', () => {
    const result = CreateProjectSchema.safeParse({ name: 'A', slug: 'proj' })
    expect(result.success).toBe(false)
  })

  it('should reject name longer than 100 chars', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'A'.repeat(101),
      slug: 'proj',
    })
    expect(result.success).toBe(false)
  })

  it('should reject slug shorter than 2 chars', () => {
    const result = CreateProjectSchema.safeParse({ name: 'Proj', slug: 'p' })
    expect(result.success).toBe(false)
  })

  it('should reject slug longer than 100 chars', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Proj',
      slug: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('should reject slug with uppercase letters', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Proj',
      slug: 'MyProj',
    })
    expect(result.success).toBe(false)
  })

  it('should reject slug with spaces', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Proj',
      slug: 'my proj',
    })
    expect(result.success).toBe(false)
  })

  it('should reject coverImage that is not a URL', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Proj',
      slug: 'proj',
      coverImage: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('should accept coverImage as an absolute path', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Proj',
      slug: 'proj',
      coverImage: '/uploads/cover.png',
    })
    expect(result.success).toBe(true)
  })

  it('should reject description longer than 500 chars', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Proj',
      slug: 'proj',
      description: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateProjectSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = UpdateProjectSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept name only', () => {
    const result = UpdateProjectSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('should accept slug only', () => {
    const result = UpdateProjectSchema.safeParse({ slug: 'newslug' })
    expect(result.success).toBe(true)
  })

  it('should accept isPublic toggle', () => {
    const result = UpdateProjectSchema.safeParse({ isPublic: true })
    expect(result.success).toBe(true)
  })

  it('should reject invalid slug pattern', () => {
    const result = UpdateProjectSchema.safeParse({ slug: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('should reject name shorter than 2 chars', () => {
    const result = UpdateProjectSchema.safeParse({ name: 'X' })
    expect(result.success).toBe(false)
  })

  it('should accept coverImage as an absolute path', () => {
    const result = UpdateProjectSchema.safeParse({
      coverImage: '/uploads/cover.png',
    })
    expect(result.success).toBe(true)
  })

  it('should accept coverImage as a valid URL', () => {
    const result = UpdateProjectSchema.safeParse({
      coverImage: 'https://example.com/cover.jpg',
    })
    expect(result.success).toBe(true)
  })

  it('should reject coverImage that is neither a path nor a URL', () => {
    const result = UpdateProjectSchema.safeParse({ coverImage: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})

describe('ListProjectsSchema', () => {
  it('should transform archived="true" to true', () => {
    const result = ListProjectsSchema.safeParse({ archived: 'true' })
    expect(result.success).toBe(true)
    expect(result.data?.archived).toBe(true)
  })

  it('should transform archived="false" to false', () => {
    const result = ListProjectsSchema.safeParse({ archived: 'false' })
    expect(result.success).toBe(true)
    expect(result.data?.archived).toBe(false)
  })

  it('should treat missing archived as false', () => {
    const result = ListProjectsSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data?.archived).toBe(false)
  })
})
