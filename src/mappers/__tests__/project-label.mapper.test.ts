import { describe, expect, it } from 'vitest'
import { createFakeProjectLabel } from '@/src/__tests__/factories/project-label.factory'
import { toProjectLabelDTO } from '../project-label.mapper'

describe('toProjectLabelDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2026-10-20T00:00:00.000Z')
    const label = createFakeProjectLabel({
      id: 'plabel-1',
      name: 'Marketing',
      description: 'Projetos do time de marketing',
      color: 'YELLOW',
      workspaceId: 'ws-1',
      createdAt: now,
      updatedAt: now,
    })

    expect(toProjectLabelDTO(label)).toEqual({
      id: 'plabel-1',
      name: 'Marketing',
      description: 'Projetos do time de marketing',
      color: 'YELLOW',
      workspaceId: 'ws-1',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    })
  })

  it('should return null for description when not set', () => {
    const dto = toProjectLabelDTO(createFakeProjectLabel({ description: null }))

    expect(dto.description).toBeNull()
  })
})
