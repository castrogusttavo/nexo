import { describe, expect, it } from 'vitest'
import { CreateCareerApplicationSchema } from '../career-application.schema'

const valid = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  consent: true,
}

describe('CreateCareerApplicationSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = CreateCareerApplicationSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts a complete valid payload', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      phone: '11999999999',
      portfolioUrl: 'https://github.com/ana',
      message: 'Tenho experiência com React e adoraria conversar.',
    })
    expect(result.success).toBe(true)
  })

  it('trims name', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      name: '  Ana Silva  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Ana Silva')
    }
  })

  it('rejects an invalid email', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a name shorter than 2 characters', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      name: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid portfolio URL', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      portfolioUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('rejects consent set to false', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      consent: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing consent', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      name: valid.name,
      email: valid.email,
    })
    expect(result.success).toBe(false)
  })

  it('accepts an empty honeypot', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      honeypot: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a missing honeypot', () => {
    const result = CreateCareerApplicationSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects a filled honeypot at the schema level', () => {
    const result = CreateCareerApplicationSchema.safeParse({
      ...valid,
      honeypot: 'a bot filled this',
    })
    expect(result.success).toBe(false)
  })
})
