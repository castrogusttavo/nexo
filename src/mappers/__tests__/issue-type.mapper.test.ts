import { describe, expect, it } from 'vitest'
import { createFakeIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { toIssueTypeDTO } from '../issue-type.mapper'

describe('toIssueTypeDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const type = createFakeIssueType({
      id: 'type-1',
      name: 'Bug',
      description: 'Algo quebrado',
      icon: 'bug-icon',
      color: 'RED',
      isSystem: false,
      order: 2,
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    expect(toIssueTypeDTO(type)).toEqual({
      id: 'type-1',
      name: 'Bug',
      description: 'Algo quebrado',
      icon: 'bug-icon',
      color: 'RED',
      isSystem: false,
      order: 2,
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })
})
