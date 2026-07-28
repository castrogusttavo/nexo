export interface ProjectDTO {
  id: string
  name: string
  slug: string
  identifier: string | null
  description: string | null
  emoji: string | null
  coverImage: string | null
  isPublic: boolean
  issueTypesEnabled: boolean
  modulesEnabled: boolean
  cyclesEnabled: boolean
  estimatesEnabled: boolean,
  isFavorited: boolean
  leadId: string
  workspaceId: string
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectMemberDTO {
  userId: string
  name: string
  username: string
  image: string | null
  email: string
  isLead: boolean
  createdAt: string
}
