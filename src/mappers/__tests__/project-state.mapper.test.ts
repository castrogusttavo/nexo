import { describe, expect, it } from 'vitest'
import { createFakeProjectState } from '@/src/__tests__/factories/project-state.factory'
import { toProjectStateDTO } from '../project-state.mapper'

describe('toProjectStateDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2026-10-13T10:00:00.000Z')
    const state = createFakeProjectState({
      id: 'pstate-1',
      name: 'Execução',
      description: 'Em andamento',
      group: 'EXECUTION',
      color: 'YELLOW',
      order: 2,
      isDefault: false,
      workspaceId: 'ws-1',
      createdAt: now,
      updatedAt: now,
    })

    expect(toProjectStateDTO(state)).toEqual({
      id: 'pstate-1',
      name: 'Execução',
      description: 'Em andamento',
      group: 'EXECUTION',
      color: 'YELLOW',
      order: 2,
      isDefault: false,
      workspaceId: 'ws-1',
      createdAt: '2026-10-13T10:00:00.000Z',
      updatedAt: '2026-10-13T10:00:00.000Z',
    })
  })

  it('should return null for description when not set', () => {
    const dto = toProjectStateDTO(createFakeProjectState({ description: null }))

    expect(dto.description).toBeNull()
  })
})
