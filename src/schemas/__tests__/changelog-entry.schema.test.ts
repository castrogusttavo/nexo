import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { ChangelogEntryFrontmatterSchema } from '../changelog-entry.schema'

const valid = {
  title: 'Barra lateral recolhível',
  slug: 'barra-lateral-recolhivel',
  date: '2026-10-29',
  summary: 'Um resumo com mais de dez caracteres.',
}

describe('ChangelogEntryFrontmatterSchema', () => {
  it('accepts an entry without improvements or fixes, as empty lists', () => {
    const parsed = ChangelogEntryFrontmatterSchema.parse(valid)

    expect(parsed.improvements).toEqual([])
    expect(parsed.fixes).toEqual([])
    expect(parsed.date).toBeInstanceOf(Date)
  })

  it('keeps the improvements and fixes in order', () => {
    const parsed = ChangelogEntryFrontmatterSchema.parse({
      ...valid,
      improvements: ['Primeira melhoria', 'Segunda melhoria'],
      fixes: ['Uma correção'],
    })

    expect(parsed.improvements).toEqual([
      'Primeira melhoria',
      'Segunda melhoria',
    ])
    expect(parsed.fixes).toEqual(['Uma correção'])
  })

  it('rejects a slug with uppercase letters', () => {
    expect(
      ChangelogEntryFrontmatterSchema.safeParse({ ...valid, slug: 'Barra' })
        .success,
    ).toBe(false)
  })

  it('rejects a summary too short for a meta description', () => {
    expect(
      ChangelogEntryFrontmatterSchema.safeParse({ ...valid, summary: 'curto' })
        .success,
    ).toBe(false)
  })

  it('rejects an empty improvement', () => {
    expect(
      ChangelogEntryFrontmatterSchema.safeParse({
        ...valid,
        improvements: [''],
      }).success,
    ).toBe(false)
  })

  it('parses every entry shipped in content/changelog, with unique slugs', () => {
    // git keeps no empty folder, so a changelog without entries has no folder.
    const dir = path.join(process.cwd(), 'content', 'changelog')
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((name) => name.endsWith('.md'))
      : []
    const slugs = files.map((name) => {
      const { data } = matter(fs.readFileSync(path.join(dir, name), 'utf-8'))
      return ChangelogEntryFrontmatterSchema.parse(data).slug
    })

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('never accepts the placeholder the empty changelog prerenders', () => {
    expect(
      ChangelogEntryFrontmatterSchema.safeParse({
        ...valid,
        slug: '__placeholder__',
      }).success,
    ).toBe(false)
  })

  it('reserves the slug "page" for the pagination', () => {
    expect(
      ChangelogEntryFrontmatterSchema.safeParse({ ...valid, slug: 'page' })
        .success,
    ).toBe(false)
  })
})
