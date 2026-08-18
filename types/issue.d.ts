import type { Value } from 'platejs'
import type { LabelDTO } from './label'
import { IssueTypeDTO } from './issue-type'

export type IssuePriorityDTO = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type IssueRelationTypeDTO = 'RELATES_TO' | 'IMPLEMENTS'
export type IssueVoteTypeDTO = 'UP' | 'DOWN'

export interface IssueDTO {
  id: string
  number: number
  title: string
  description: Value
  priority: IssuePriorityDTO
  startDate: string | null
  dueDate: string | null
  stateId: string
  typeId: string
  cycleId: string | null
  moduleId: string | null
  labelIds: string[]
  assigneeIds: string[]
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

export type IssueDependencyTypeDTO =
  | 'BLOCKS'
  | 'STARTS_BEFORE'
  | 'FINISHES_BEFORE'

export interface IssueDependencyDTO {
  id: string
  sourceId: string
  targetId: string
  type: IssueDependencyTypeDTO
  createdAt: string
}

export interface IssueRelationDTO {
  id: string
  sourceId: string
  targetId: string
  type: IssueRelationTypeDTO,
  createdAt: string
}

export interface IssueVoteSummaryDTO {
  up: number
  down: number
  myVote: IssueVoteTypeDTO | null
}
