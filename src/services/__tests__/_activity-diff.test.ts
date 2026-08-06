import { describe, expect, it, vi } from 'vitest'
import { recordFieldChanges } from '../_activity-diff'
import { ActivityService } from '../activity.service'

vi.mock('../activity.service')

const mockedActivityService = vi.mocked(ActivityService)

describe('recordFieldChanges', () => {
  it('should record only the fields that changed', () => {
    recordFieldChanges(
      'ISSUE',
      'issue-1',
      'actor',
      { stateId: 'state-1', priority: 'NONE' },
      { stateId: 'state-2', priority: 'NONE' },
    )

    expect(mockedActivityService.record).toHaveBeenCalledTimes(1)
    expect(mockedActivityService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'stateId',
        oldValue: 'state-1',
        newValue: 'state-2',
      }),
    )
  })

  it('should not record when nothing changed', () => {
    recordFieldChanges(
      'ISSUE',
      'issue-1',
      'actor',
      { priority: 'HIGH' },
      { priority: 'HIGH' },
    )

    expect(mockedActivityService.record).not.toHaveBeenCalled()
  })

  it('should treat equal Date instants as unchanged', () => {
    recordFieldChanges(
      'ISSUE',
      'issue-1',
      'actor',
      { dueDate: new Date('2025-03-01T10:00:00.000Z') },
      { dueDate: new Date('2025-03-01T10:00:00.000Z') },
    )

    expect(mockedActivityService.record).not.toHaveBeenCalled()
  })

  it('should record a Date field as an ISO string', () => {
    recordFieldChanges(
      'ISSUE',
      'issue-1',
      'actor',
      { dueDate: null },
      { dueDate: new Date('2025-03-01T10:00:00.000Z') },
    )

    expect(mockedActivityService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'dueDate',
        oldValue: null,
        newValue: '2025-03-01T10:00:00.000Z',
      }),
    )
  })

  it('should treat undefined and null as equivalent absence', () => {
    recordFieldChanges(
      'ISSUE',
      'issue-1',
      'actor',
      { cycleId: undefined },
      { cycleId: null },
    )

    expect(mockedActivityService.record).not.toHaveBeenCalled()
  })
})
