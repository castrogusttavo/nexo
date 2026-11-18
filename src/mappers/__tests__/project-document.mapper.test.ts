import { describe, expect, it } from 'vitest'
import { toProjectDocumentDTO } from '../project-document.mapper'

describe('toProjectDocumentDTO', () => {
  it('should expose the content and an ISO updatedAt', () => {
    const at = new Date('2026-11-16T10:00:00Z')

    const dto = toProjectDocumentDTO({
      document: [{ type: 'p', children: [{ text: 'x' }] }],
      documentUpdatedAt: at,
    })

    expect(dto.updatedAt).toBe(at.toISOString())
    expect(dto.content).toHaveLength(1)
  })

  it('should return null updatedAt and [] when never saved', () => {
    const dto = toProjectDocumentDTO({ document: [], documentUpdatedAt: null })

    expect(dto).toEqual({ content: [], updatedAt: null })
  })

  it('should fall back to [] when the stored json is not an array', () => {
    const dto = toProjectDocumentDTO({
      document: {},
      documentUpdatedAt: null,
    })

    expect(dto.content).toEqual([])
  })
})
