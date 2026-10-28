import { describe, expect, it } from 'vitest'
import { LegalDocFrontmatterSchema, legalDocSlug } from '../legal-doc.schema'

const VALID = {
  title: 'Termos de Uso',
  slug: 'termos-de-uso',
  date: '2026-01-15',
  summary: 'Regras para usar a plataforma Nexo.',
}

describe('legalDocSlug', () => {
  it('trims and accepts lowercase letters, digits and hyphens', () => {
    expect(legalDocSlug.parse('  privacidade-2026 ')).toBe('privacidade-2026')
  })

  it.each([
    ['too short', 'a', 'Slug deve ter ao menos 2 caracteres'],
    ['too long', 'a'.repeat(101), 'Slug deve ter no máximo 100 caracteres'],
    [
      'uppercase',
      'Termos',
      'slug deve conter apenas letras minúsculas, números e hífens',
    ],
    [
      'spaces',
      'termos de uso',
      'slug deve conter apenas letras minúsculas, números e hífens',
    ],
  ])('rejects a slug that is %s', (_case, slug, message) => {
    const result = legalDocSlug.safeParse(slug)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(message)
  })
})

describe('LegalDocFrontmatterSchema', () => {
  it('parses valid frontmatter and coerces the date', () => {
    const parsed = LegalDocFrontmatterSchema.parse(VALID)

    expect(parsed.date).toBeInstanceOf(Date)
    expect(parsed.date.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    expect(parsed.slug).toBe('termos-de-uso')
  })

  it.each([
    ['title', { title: 'T' }],
    ['title', { title: 'T'.repeat(121) }],
    ['summary', { summary: 'curto' }],
    ['summary', { summary: 's'.repeat(301) }],
    ['date', { date: 'not-a-date' }],
    ['slug', { slug: 'Bad Slug' }],
  ])('rejects an invalid %s', (field, override) => {
    const result = LegalDocFrontmatterSchema.safeParse({
      ...VALID,
      ...override,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual([field])
  })
})
