import type { Issue } from '@prisma/client'
import type { JSONContent } from '@tiptap/react'
import type { IssueDTO } from '@/types/issue'
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
    assigneeId: issue.assigneeId ?? null,
    authorId: issue.authorId,
    projectId: issue.projectId,
    ...withTimestamps(issue),
  }
}
