import type { JSONContent } from '@tiptap/react'

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
  authorId: string
  projectId: string
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
