import type { JSONContent } from '@tiptap/react'
import type { LabelDTO } from './label'

export type IssuePriorityDTO = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface IssueDTO {
  id: string
  number: number
  title: string
  description: JSONContent
  priority: IssuePriorityDTO
  startDate: string | null
  dueDate: string | null
  stateId: string
  typeId: string
  cycleId: string | null
  moduleId: string | null
  estimateValueId: string | null
  authorId: string
  projectId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface IssueAssigneeDTO {
  id: string
  issueId: string
  userId: string
  user: {
    id: string
    name: string
    username: string
    image: string | null
  }
  createdAt: string
}

export interface IssueSubscriberDTO {
  id: string
  issueId: string
  userId: string
  createdAt: string
}

export interface IssueLabelDTO {
  id: string
  issueId: string
  labelId: string
  label: LabelDTO,
  createdAt: string
}
