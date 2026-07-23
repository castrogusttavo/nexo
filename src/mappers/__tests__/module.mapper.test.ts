import { describe, expect, it } from 'vitest'
import { createFakeModule } from '@/src/__tests__/factories/module.factory'
import { toModuleDTO } from '../module.mapper'

describe('toModuleDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const startDate = new Date('2025-03-01T00:00:00.000Z')
    const endDate = new Date('2025-06-01T00:00:00.000Z')
    const module = createFakeModule({
      id: 'mod-1',
      name: 'Auth',
      progress: 40,
      status: 'IN_PROGRESS',
      startDate,
      endDate,
      leadId: 'user-1',
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    const dto = toModuleDTO(module, true)

    expect(dto).toEqual({
      id: 'mod-1',
      name: 'Auth',
      progress: 40,
      status: 'IN_PROGRESS',
      startDate: '2025-03-01T00:00:00.000Z',
      endDate: '2025-06-01T00:00:00.000Z',
      isFavorited: true,
      leadId: 'user-1',
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should return null for start/end dates when not set', () => {
    const module = createFakeModule({ startDate: null, endDate: null })

    const dto = toModuleDTO(module)

    expect(dto.startDate).toBeNull()
    expect(dto.endDate).toBeNull()
    expect(dto.isFavorited).toBe(false)
  })
})
