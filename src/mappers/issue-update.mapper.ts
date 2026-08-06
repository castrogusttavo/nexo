import type { IssueUpdateDTO } from '@/types/issue-update'
import type { IssueUpdateWithAuthor } from '../repositories/issue-update.repository'

export function toIssueUpdateDTO(
  update: IssueUpdateWithAuthor,
): IssueUpdateDTO {
  return {
    id: update.id,
    status: update.status,
    content: update.content,
    issueId: update.issueId,
    author: update.author,
    editedAt: update.editedAt?.toISOString() ?? null,
    createdAt: update.createdAt.toISOString(),
    updatedAt: update.updatedAt.toISOString(),
  }
}
