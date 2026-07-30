import { describe, expect, it } from 'vitest'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { toIssueDTO } from '../issue.mapper'

describe('toIssueDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const issue = createFakeIssue({
      id: 'issue-1',
      number: 3,
      title: 'Fix login bug',
      description: { type: 'doc', content: [] },
      priority: 'HIGH',
      stateId: 'state-1',
      typeId: 'type-1',
      assigneeId: 'user-2',
      authorId: 'user-1',
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    expect(toIssueDTO(issue)).toEqual({
      id: 'issue-1',
      number: 3,
      title: 'Fix login bug',
      description: { type: 'doc', content: [] },
      priority: 'HIGH',
      stateId: 'state-1',
      typeId: 'type-1',
      assigneeId: 'user-2',
      authorId: 'user-1',
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should map a null assigneeId as null', () => {
    const issue = createFakeIssue({ assigneeId: null })

    expect(toIssueDTO(issue).assigneeId).toBeNull()
  })
})
