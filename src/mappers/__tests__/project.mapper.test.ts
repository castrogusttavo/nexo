import { describe, expect, it } from 'vitest'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { toProjectDTO } from '../project.mapper'

describe('toProjectDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const project = createFakeProject({
      id: 'proj-1',
      name: 'Alpha',
      slug: 'alpha',
      description: 'A great project',
      emoji: '🚀',
      coverImage: 'https://example.com/cover.jpg',
      isPublic: true,
      leadId: 'user-1',
      workspaceId: 'ws-1',
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    })

    const dto = toProjectDTO(project)

    expect(dto).toEqual({
      id: 'proj-1',
      name: 'Alpha',
      slug: 'alpha',
      description: 'A great project',
      emoji: '🚀',
      coverImage: 'https://example.com/cover.jpg',
      isPublic: true,
      isFavorited: false,
      leadId: 'user-1',
      workspaceId: 'ws-1',
      archivedAt: null,
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should serialize createdAt/updatedAt as ISO strings', () => {
    const createdAt = new Date('2025-01-15T10:30:00.000Z')
    const updatedAt = new Date('2025-02-01T08:00:00.000Z')
    const project = createFakeProject({
      createdAt,
      updatedAt,
    })

    const dto = toProjectDTO(project)

    expect(dto.createdAt).toBe('2025-01-15T10:30:00.000Z')
    expect(dto.updatedAt).toBe('2025-02-01T08:00:00.000Z')
  })

  it('should serialize archivedAt as ISO string when set', () => {
    const archivedAt = new Date('2025-03-03T10:00:00.000Z')
    const project = createFakeProject({
      archivedAt,
    })

    const dto = toProjectDTO(project)

    expect(dto.archivedAt).toBe('2025-03-03T10:00:00.000Z')
  })

  it('should return null for archivedAt when project is active', () => {
    const project = createFakeProject({
      archivedAt: null,
    })

    const dto = toProjectDTO(project)

    expect(dto.archivedAt).toBeNull()
  })

  it('should return null for optional fields when not set', () => {
    const project = createFakeProject({
      description: null,
      emoji: null,
      coverImage: null,
    })

    const dto = toProjectDTO(project)

    expect(dto.description).toBeNull()
    expect(dto.emoji).toBeNull()
    expect(dto.coverImage).toBeNull()
  })
})
