import type { JSONContent } from "@tiptap/react"

export interface CommentAuthorDTO {
  id: string
  name: string
  username: string
  image: string | null
}

export interface CommentDTO {
  id: string
  content: JSONContent
  issueId: string
  parentId: string | null
  author: CommentAuthorDTO
  editedAt: string | null
  createdAt: string
  updatedAt: string
}
