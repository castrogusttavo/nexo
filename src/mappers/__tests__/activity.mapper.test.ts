import { describe, expect, it } from 'vitest'
import { createFakeActivity } from '@/src/__tests__/factories/activity.factory'
import type { ActivityWithActor } from '@/src/repositories/activity.repository'
import { toActivityDTO } from '../activity.mapper'

function withActor(overrides?: Partial<ActivityWithActor>): ActivityWithActor {
  return {
    ...createFakeActivity(),
    actor: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    ...overrides,
  }
}

describe('toActivityDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const activity = withActor({
      id: 'activity-1',
      entityType: 'ISSUE',
      entityId: 'issue-1',
      field: 'priority',
      oldValue: 'NONE',
      newValue: 'HIGH',
      createdAt: now,
    })

    expect(toActivityDTO(activity)).toEqual({
      id: 'activity-1',
      entityType: 'ISSUE',
      entityId: 'issue-1',
      field: 'priority',
      oldValue: 'NONE',
      newValue: 'HIGH',
      actor: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
      createdAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should map a null oldValue for an add event', () => {
    const activity = withActor({ oldValue: null, newValue: 'Bug' })

    expect(toActivityDTO(activity).oldValue).toBeNull()
  })
})
