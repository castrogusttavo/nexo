import { describe, expect, it } from 'vitest'
import {
  createFakeEstimateSettings,
  createFakeEstimateValue,
} from '@/src/__tests__/factories/estimate.factory'
import { toEstimateSettingsDTO, toEstimateValueDTO } from '../estimate.mapper'

describe('toEstimateSettingsDTO', () => {
  it('should map settings and embed the values array', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const settings = createFakeEstimateSettings({
      id: 'est-1',
      system: 'TIME',
      model: 'HOURS',
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })
    const value = createFakeEstimateValue({
      id: 'val-1',
      value: '2h',
      order: 0,
      estimateSettingsId: 'est-1',
      createdAt: now,
      updatedAt: now,
    })

    const dto = toEstimateSettingsDTO(settings, [value])

    expect(dto).toEqual({
      id: 'est-1',
      system: 'TIME',
      model: 'HOURS',
      projectId: 'proj-1',
      values: [
        {
          id: 'val-1',
          value: '2h',
          order: 0,
          estimateSettingsId: 'est-1',
          createdAt: '2025-03-01T10:00:00.000Z',
          updatedAt: '2025-03-01T10:00:00.000Z',
        },
      ],
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })
})

describe('toEstimateValueDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const value = createFakeEstimateValue({
      id: 'val-1',
      value: '2h',
      order: 3,
      estimateSettingsId: 'est-1',
      createdAt: now,
      updatedAt: now,
    })

    expect(toEstimateValueDTO(value)).toEqual({
      id: 'val-1',
      value: '2h',
      order: 3,
      estimateSettingsId: 'est-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })
})
