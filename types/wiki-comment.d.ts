import type { Value } from 'platejs'

export interface WikiCommentAuthorDTO {
  id: string
  name: string
  username: string
  image: string | null
}

export interface WikiCommentDTO {
  id: string
  wikiPageId: string
  markId: string
  parentId: string | null
  content: Value
  author: WikiCommentAuthorDTO
  resolved: boolean
  resolvedAt: string | null
  resolvedById: string | null
  createdAt: string
  updatedAt: string
}
