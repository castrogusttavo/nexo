import { describe, expect, it } from 'vitest'
import { createFakeStickyNote } from '@/src/__tests__/factories/sticky-note.factory'
import { toStickyNoteDTO } from '../sticky-note.mapper'

describe('toStickyNoteDTO()', () => {
  it('should map all fields correctly', () => {
    const content = { type: 'doc', content: [{ type: 'paragraph' }] }
    const sticky = createFakeStickyNote({
      id: 'sn-1',
      content,
      color: 'BLUE',
      userId: 'u-1',
    })

    const dto = toStickyNoteDTO(sticky)

    expect(dto).toEqual({
      id: 'sn-1',
      content,
      color: 'BLUE',
      userId: 'u-1',
      createdAt: sticky.createdAt.toISOString(),
      updatedAt: sticky.updatedAt.toISOString(),
    })
  })

  it('should serialize createdAt/updatedAt as ISO strings', () => {
    const created = new Date('2026-01-15T10:30:00.000Z')
    const updated = new Date('2026-01-15T08:00:00.000Z')
    const sticky = createFakeStickyNote({
      createdAt: created,
      updatedAt: updated,
    })

    const dto = toStickyNoteDTO(sticky)

    expect(dto.createdAt).toBe('2026-01-15T10:30:00.000Z')
    expect(dto.updatedAt).toBe('2026-01-15T08:00:00.000Z')
  })

  it('should preserve color enum value', () => {
    const sticky = createFakeStickyNote({ color: 'YELLOW' })

    const dto = toStickyNoteDTO(sticky)

    expect(dto.color).toBe('YELLOW')
  })

  it('should fallback to empty doc when content is null', () => {
    const sticky = createFakeStickyNote({
      content: null as unknown as ReturnType<
        typeof createFakeStickyNote
      >['content'],
    })

    const dto = toStickyNoteDTO(sticky)

    expect(dto.content).toEqual({ type: 'doc', content: [] })
  })
})
