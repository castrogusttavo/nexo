export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type MemberAccountStatus = 'ACTIVE' | 'UNVERIFIED' | 'PENDING_DELETION'
export type MemberAuthMethod = 'EMAIL_PASSWORD' | 'GOOGLE' | 'GITHUB'

export interface MemberDTO {
  membershipId: string
  userId: string
  name: string
  username: string
  email: string
  image: string | null
  role: MemberRole
  accountStatus: MemberAccountStatus
  authMethods: MemberAuthMethod[]
  twoFactorEnabled: boolean
  joinedAt: string
}

export interface ListMembersResult {
  members: MemberDTO[]
  total: number
  page: number
  pageSize: number
}
