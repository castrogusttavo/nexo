import type { JSONContent } from '@tiptap/react'

export type IssuePriorityDTO = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface IssueDTO {
  id: string
  number: number
  title: string
  description: JSONContent
  priority: IssuePriorityDTO
  stateId: string
  typeId: string
  authorId: string
  projectId: string
  createdAt: string
  updatedAt: string
}
