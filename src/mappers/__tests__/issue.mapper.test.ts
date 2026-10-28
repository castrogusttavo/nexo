import { describe, expect, it } from 'vitest'
import { EMPTY_ISSUE_DESCRIPTION } from '@/lib/editor-value'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeLabel } from '@/src/__tests__/factories/label.factory'
import {
  toIssueAssigneeDTO,
  toIssueDependencyDTO,
  toIssueDTO,
  toIssueLabelDTO,
  toIssueRelationDTO,
  toIssueSubscriberDTO,
} from '../issue.mapper'
import { toLabelDTO } from '../label.mapper'

const CREATED_AT = new Date('2025-03-01T10:00:00.000Z')

const PLATE_DESCRIPTION = [
  { type: 'p', children: [{ text: 'Steps to reproduce' }] },
]

describe('toIssueDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const issue = createFakeIssue({
      id: 'issue-1',
      number: 3,
      title: 'Fix login bug',
      description: PLATE_DESCRIPTION,
      priority: 'HIGH',
      startDate: null,
      dueDate: null,
      stateId: 'state-1',
      cycleId: 'cycle-1',
      moduleId: 'module-1',
      estimateValueId: 'value-1',
      typeId: 'type-1',
      authorId: 'user-1',
      projectId: 'proj-1',
      parentId: 'parent-1',
      createdAt: now,
      updatedAt: now,
    })

    expect(toIssueDTO(issue)).toEqual({
      id: 'issue-1',
      number: 3,
      title: 'Fix login bug',
      description: PLATE_DESCRIPTION,
      priority: 'HIGH',
      startDate: null,
      dueDate: null,
      stateId: 'state-1',
      typeId: 'type-1',
      cycleId: 'cycle-1',
      moduleId: 'module-1',
      labelIds: [],
      assigneeIds: [],
      estimateValueId: 'value-1',
      authorId: 'user-1',
      projectId: 'proj-1',
      parentId: 'parent-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should map dates as ISO strings', () => {
    const start = new Date('2025-03-01T10:00:00.000Z')
    const end = new Date('2025-03-05T10:00:00.000Z')
    const issue = createFakeIssue({ startDate: start, dueDate: end })

    const dto = toIssueDTO(issue)

    expect(dto.startDate).toBe('2025-03-01T10:00:00.000Z')
    expect(dto.dueDate).toBe('2025-03-05T10:00:00.000Z')
  })

  it('falls back to the empty description when the stored value is not an array', () => {
    const issue = createFakeIssue({ description: { type: 'doc' } })

    expect(toIssueDTO(issue).description).toEqual(EMPTY_ISSUE_DESCRIPTION)
  })

  it('maps missing optional relations to null', () => {
    const issue = createFakeIssue({
      cycleId: null,
      moduleId: null,
      estimateValueId: null,
      parentId: null,
    })

    expect(toIssueDTO(issue)).toMatchObject({
      cycleId: null,
      moduleId: null,
      estimateValueId: null,
      parentId: null,
    })
  })

  it('copies the label and assignee groups when they are given', () => {
    const dto = toIssueDTO(createFakeIssue(), {
      labelIds: ['label-1'],
      assigneeIds: ['user-1', 'user-2'],
    })

    expect(dto.labelIds).toEqual(['label-1'])
    expect(dto.assigneeIds).toEqual(['user-1', 'user-2'])
  })
})

describe('issue join-row mappers', () => {
  it('toIssueAssigneeDTO keeps the user and serialises createdAt', () => {
    const user = { id: 'user-1', name: 'Ana', username: 'ana', image: null }

    expect(
      toIssueAssigneeDTO({
        id: 'a-1',
        issueId: 'issue-1',
        userId: 'user-1',
        user,
        createdAt: CREATED_AT,
      } as Parameters<typeof toIssueAssigneeDTO>[0]),
    ).toEqual({
      id: 'a-1',
      issueId: 'issue-1',
      userId: 'user-1',
      user,
      createdAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('toIssueSubscriberDTO serialises createdAt', () => {
    expect(
      toIssueSubscriberDTO({
        id: 's-1',
        issueId: 'issue-1',
        userId: 'user-1',
        createdAt: CREATED_AT,
      } as Parameters<typeof toIssueSubscriberDTO>[0]),
    ).toEqual({
      id: 's-1',
      issueId: 'issue-1',
      userId: 'user-1',
      createdAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('toIssueLabelDTO maps the nested label through toLabelDTO', () => {
    const label = createFakeLabel()

    expect(
      toIssueLabelDTO({
        id: 'il-1',
        issueId: 'issue-1',
        labelId: label.id,
        label,
        createdAt: CREATED_AT,
      } as Parameters<typeof toIssueLabelDTO>[0]),
    ).toEqual({
      id: 'il-1',
      issueId: 'issue-1',
      labelId: label.id,
      label: toLabelDTO(label),
      createdAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it.each([
    ['toIssueDependencyDTO', toIssueDependencyDTO, 'BLOCKS'],
    ['toIssueRelationDTO', toIssueRelationDTO, 'RELATES_TO'],
  ] as const)('%s keeps source, target and type', (_name, mapper, type) => {
    const row = {
      id: 'r-1',
      sourceId: 'issue-1',
      targetId: 'issue-2',
      type,
      createdAt: CREATED_AT,
    }

    expect(mapper(row as never)).toEqual({
      ...row,
      createdAt: '2025-03-01T10:00:00.000Z',
    })
  })
})
