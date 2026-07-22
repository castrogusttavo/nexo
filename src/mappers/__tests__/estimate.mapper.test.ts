import { describe, expect, it } from 'vitest'
import { createFakeEstimateSettings } from '@/src/__tests__/factories/estimate.factory'
import { toEstimateSettingsDTO } from '../estimate.mapper'

describe('toEstimateSettingsDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const settings = createFakeEstimateSettings({
      id: 'est-1',
      system: 'TIME',
      model: 'HOURS',
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    const dto = toEstimateSettingsDTO(settings)

    expect(dto).toEqual({
      id: 'est-1',
      system: 'TIME',
      model: 'HOURS',
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })
})
