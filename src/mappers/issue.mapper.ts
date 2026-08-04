import type {
  Issue,
  IssueDependency,
  IssueRelation,
  IssueSubscriber,
} from '@prisma/client'
import type { JSONContent } from '@tiptap/react'
import type {
  IssueAssigneeDTO,
  IssueDependencyDTO,
  IssueDTO,
  IssueLabelDTO,
  IssueRelationDTO,
  IssueSubscriberDTO,
} from '@/types/issue'
import type { IssueAssigneeWithUser } from '../repositories/issue-assignee.repository'
import type { IssueLabelWithLabel } from '../repositories/issue-label.repository'
import { withTimestamps } from './_shared'
import { toLabelDTO } from './label.mapper'

export function toIssueDTO(issue: Issue): IssueDTO {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    description: (issue.description as JSONContent) ?? {
      type: 'doc',
      content: [],
    },
    priority: issue.priority,
    startDate: issue.startDate?.toISOString() ?? null,
    dueDate: issue.dueDate?.toISOString() ?? null,
    stateId: issue.stateId,
    typeId: issue.typeId,
    cycleId: issue.cycleId ?? null,
    moduleId: issue.moduleId ?? null,
    estimateValueId: issue.estimateValueId ?? null,
    authorId: issue.authorId,
    projectId: issue.projectId,
    parentId: issue.parentId ?? null,
    ...withTimestamps(issue),
  }
}

export function toIssueAssigneeDTO(
  assignee: IssueAssigneeWithUser,
): IssueAssigneeDTO {
  return {
    id: assignee.id,
    issueId: assignee.issueId,
    userId: assignee.userId,
    user: assignee.user,
    createdAt: assignee.createdAt.toISOString(),
  }
}

export function toIssueSubscriberDTO(
  subscriber: IssueSubscriber,
): IssueSubscriberDTO {
  return {
    id: subscriber.id,
    issueId: subscriber.issueId,
    userId: subscriber.userId,
    createdAt: subscriber.createdAt.toISOString(),
  }
}

export function toIssueLabelDTO(
  issueLabel: IssueLabelWithLabel,
): IssueLabelDTO {
  return {
    id: issueLabel.id,
    issueId: issueLabel.issueId,
    labelId: issueLabel.labelId,
    label: toLabelDTO(issueLabel.label),
    createdAt: issueLabel.createdAt.toISOString(),
  }
}

export function toIssueDependencyDTO(
  dependency: IssueDependency,
): IssueDependencyDTO {
  return {
    id: dependency.id,
    sourceId: dependency.sourceId,
    targetId: dependency.targetId,
    type: dependency.type,
    createdAt: dependency.createdAt.toISOString(),
  }
}

export function toIssueRelationDTO(relation: IssueRelation): IssueRelationDTO {
  return {
    id: relation.id,
    sourceId: relation.sourceId,
    targetId: relation.targetId,
    type: relation.type,
    createdAt: relation.createdAt.toISOString(),
  }
}
