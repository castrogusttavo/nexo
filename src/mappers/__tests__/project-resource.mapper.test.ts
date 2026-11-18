import { describe, expect, it } from 'vitest'
import {
  summarizeProjectReactions,
  toProjectAttachmentDTO,
  toProjectLinkDTO,
} from '../project-resource.mapper'

const at = new Date('2026-11-17T10:00:00Z')

describe('summarizeProjectReactions', () => {
  it('should count per emoji, flag the viewer and sort by count', () => {
    const result = summarizeProjectReactions(
      [
        { emoji: '🔥', userId: 'a' },
        { emoji: '👍', userId: 'a' },
        { emoji: '👍', userId: 'me' },
      ],
      'me',
    )

    expect(result).toEqual([
      { emoji: '👍', count: 2, reactedByMe: true },
      { emoji: '🔥', count: 1, reactedByMe: false },
    ])
  })

  it('should return [] without reactoins', () => {
    expect(summarizeProjectReactions([], 'me')).toEqual([])
  })
})

describe('toProjectLinkDTO', () => {
  it('should map the link with an ISO date', () => {
    const dto = toProjectLinkDTO({
      id: 'l1',
      projectId: 'p1',
      title: null,
      url: 'https://a.com',
      createdById: 'u1',
      createdAt: at,
      updatedAt: at,
    })

    expect(dto).toEqual({
      id: 'l1',
      projectId: 'p1',
      title: null,
      url: 'https://a.com',
      createdById: 'u1',
      createdAt: at.toISOString(),
    })
  })
})

describe('toProjectAttachmentDTO', () => {
  it('should expose signed url and hide bucket and key', () => {
    const dto = toProjectAttachmentDTO(
      {
        id: 'a1',
        fileName: 'plano.pdf',
        contentType: 'application/pdf',
        size: 10,
        bucket: 'project-attachments',
        key: 'p1/abc',
        projectId: 'p1',
        uploadedById: 'u1',
        createdAt: at,
      },
      'https://signed',
    )

    expect(dto.url).toBe('https://signed')
    expect(dto).not.toHaveProperty('bucket')
    expect(dto).not.toHaveProperty('key')
  })
})
