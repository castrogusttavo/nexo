import type { Issue, IssueSubscriber } from '@prisma/client'
import type { JSONContent } from '@tiptap/react'
import type {
  IssueAssigneeDTO,
  IssueDTO,
  IssueSubscriberDTO,
} from '@/types/issue'
import type { IssueAssigneeWithUser } from '../repositories/issue-assignee.repository'
import { withTimestamps } from './_shared'

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
