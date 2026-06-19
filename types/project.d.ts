export interface ProjectDTO {
  id: string
  name: string
  slug: string
  description: string | null
  emoji: string | null
  coverImage: string | null
  isPublic: boolean
  isFavorited: boolean
  leadId: string
  workspaceId: string
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}
