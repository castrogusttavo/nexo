import { describe, expect, it } from 'vitest'
import { createFakeWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { toWikiPageDTO } from '../wiki-page.mapper'

describe('toWikiPageDTO()', () => {
  it('should map a WikiPage to its DTO', () => {
    const wikiPage = createFakeWikiPage({
      id: 'w1',
      title: 'Onboarding',
      archivedAt: null,
    })

    const dto = toWikiPageDTO(wikiPage)

    expect(dto.id).toBe('w1')
    expect(dto.title).toBe('Onboarding')
    expect(dto.archivedAt).toBeNull()
    expect(typeof dto.createdAt).toBe('string')
  })

  it('should format archivedAt as ISO string when present', () => {
    const archivedAt = new Date('2026-01-01T00:00:00.000Z')
    const wikiPage = createFakeWikiPage({ archivedAt })

    const dto = toWikiPageDTO(wikiPage)

    expect(dto.archivedAt).toBe(archivedAt.toISOString())
  })
})
