import { describe, expect, it } from 'vitest'
import { createFakeState } from '@/src/__tests__/factories/state.factory'
import { toStateDTO } from '../state.mapper'

describe('toStateDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const state = createFakeState({
      id: 'state-1',
      name: 'In Progress',
      description: 'Work underway',
      group: 'STARTED',
      color: 'BLUE',
      order: 2,
      isDefault: true,
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    const dto = toStateDTO(state)

    expect(dto).toEqual({
      id: 'state-1',
      name: 'In Progress',
      description: 'Work underway',
      group: 'STARTED',
      color: 'BLUE',
      order: 2,
      isDefault: true,
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should return null for description when not set', () => {
    const state = createFakeState({ description: null })

    const dto = toStateDTO(state)

    expect(dto.description).toBeNull()
  })
})
