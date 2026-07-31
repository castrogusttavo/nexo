import type { Issue, IssueSubscriber } from '@prisma/client'
import type { JSONContent } from '@tiptap/react'
import type {
  IssueAssigneeDTO,
  IssueDTO,
  IssueLabelDTO,
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
    authorId: issue.authorId,
    projectId: issue.projectId,
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
