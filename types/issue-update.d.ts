export type IssueUpdateStatusDTO = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'

export interface IssueUpdateAuthorDTO {
  id: string
  name: string
  username: string
  image: string | null
}

export interface IssueUpdateDTO {
  id: string
  status: IssueUpdateStatusDTO
  content: string | null
  issueId: string
  author: IssueUpdateAuthorDTO
  editedAt: string | null
  createdAt: string
  updatedAt: string
}
