import { describe, expect, it } from 'vitest'
import { createFakeShortLink } from '@/src/__tests__/factories/short-link.factory'
import { toShortLinkDTO } from '../short-link.mapper'

describe('toShortLinkDTO()', () => {
  it('should map all fields correctly', () => {
    const link = createFakeShortLink({
      id: 'sl-1',
      title: 'My Link',
      url: 'https://example.com',
      userId: 'u-1',
    })

    const dto = toShortLinkDTO(link)

    expect(dto).toEqual({
      id: 'sl-1',
      title: 'My Link',
      url: 'https://example.com',
      userId: 'u-1',
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    })
  })

  it('should serialize createdAt/updatedAt as ISO strings', () => {
    const created = new Date('2025-01-15T10:30:00.000Z')
    const updated = new Date('2025-02-01T08:00:00.000Z')
    const link = createFakeShortLink({
      createdAt: created,
      updatedAt: updated,
    })

    const dto = toShortLinkDTO(link)

    expect(dto.createdAt).toBe('2025-01-15T10:30:00.000Z')
    expect(dto.updatedAt).toBe('2025-02-01T08:00:00.000Z')
  })
})
