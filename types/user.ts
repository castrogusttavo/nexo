export interface MembershipDTO {
  workspaceId: string
  slug: string
  name: string
  role: string
}

export interface UserDTO {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: string
  memberships: MembershipDTO[]
}
