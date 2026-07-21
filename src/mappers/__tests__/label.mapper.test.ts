import { describe, expect, it } from 'vitest'
import { createFakeLabel } from '@/src/__tests__/factories/label.factory'
import { toLabelDTO } from '../label.mapper'

describe('toLabelDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const label = createFakeLabel({
      id: 'label-1',
      name: 'Bug',
      description: 'Something broken',
      color: 'RED',
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    const dto = toLabelDTO(label)

    expect(dto).toEqual({
      id: 'label-1',
      name: 'Bug',
      description: 'Something broken',
      color: 'RED',
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should return null for description when not set', () => {
    const label = createFakeLabel({ description: null })

    const dto = toLabelDTO(label)

    expect(dto.description).toBeNull()
  })
})
