import { describe, expect, it } from 'vitest'
import {
  ChangeCareerJobStatusSchema,
  CreateCareerJobSchema,
  UpdateCareerJobSchema,
} from '../career-job.schema'

const validContent = {
  about: 'Você vai construir a interface do Nexo do zero.',
  responsibilities: ['Construir features de UI', 'Escrever testes'],
  requirements: ['React e TypeScript'],
  stack: ['Next.js', 'Tailwind CSS'],
}

const valid = {
  slug: 'junior-frontend-engineer',
  title: 'Junior Frontend Engineer',
  summary: 'Vaga para quem está começando a carreira em frontend.',
  content: validContent,
}

describe('CreateCareerJobSchema', () => {
  it('accepts a complete valid payload', () => {
    const result = CreateCareerJobSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts a slug with hyphens', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      slug: 'mid-level-backend-engineer',
    })
    expect(result.success).toBe(true)
  })

  it('reject a slug with uppercase letters', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      slug: 'Junior-Frontend',
    })
    expect(result.success).toBe(false)
  })

  it('reject a slug with spaces or special characteres', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      slug: 'junior frontend!',
    })
    expect(result.success).toBe(false)
  })

  it('accepts an optional department', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      department: 'Engineering',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a summary shorter than 10 characteres', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      summary: 'curto',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a summary longer then 700 characteres', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      summary: 'a'.repeat(701),
    })
    expect(result.success).toBe(false)
  })

  it('rejects content with an about longer than 2000 characters', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      content: { ...validContent, about: 'a'.repeat(2001) },
    })
    expect(result.success).toBe(false)
  })

  it('rejects content missing responsibilities', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      content: { ...validContent, responsibilities: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejects content missing requirements', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      content: { ...validContent, requirements: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejects content missing stack', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      content: { ...validContent, stack: [] },
    })
    expect(result.success).toBe(false)
  })

  it('accepts content without niceToHave', () => {
    const result = CreateCareerJobSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content.niceToHave).toBeUndefined()
    }
  })

  it('accepts content with niceToHave', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      content: { ...validContent, niceToHave: ['Contribuições open-source'] },
    })
    expect(result.success).toBe(true)
  })

  it('should rejects when a required field is missing', () => {
    const result = CreateCareerJobSchema.safeParse({
      title: valid.title,
    })
    expect(result.success).toBe(false)
  })

  it('does not accept a status as part of creation', () => {
    const result = CreateCareerJobSchema.safeParse({
      ...valid,
      status: 'OPEN',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).status).toBeUndefined()
    }
  })
})

describe('UpdateCareerJobSchema', () => {
  it('accepts an empty object (all optional)', () => {
    const result = UpdateCareerJobSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts a title-only partial update', () => {
    const result = UpdateCareerJobSchema.safeParse({
      title: 'Junior Frontend Engineer II',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid slug even in a partial update', () => {
    const result = UpdateCareerJobSchema.safeParse({
      slug: 'Invalid Slug!',
    })
    expect(result.success).toBe(false)
  })
})

describe('ChangeCareerJobStatusSchema', () => {
  it.each(['DRAFT', 'OPEN', 'CLOSED'])('accepts status %s', (status) => {
    const result = ChangeCareerJobStatusSchema.safeParse({ status })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown status', () => {
    const result = ChangeCareerJobStatusSchema.safeParse({
      status: 'ARCHIVED',
    })
    expect(result.success).toBe(false)
  })
})
