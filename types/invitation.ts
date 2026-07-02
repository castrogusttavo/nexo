import type { ProjectMemberDTO } from './project'

export interface InvitationDTO {
  id: string,
  email: string,
  role: string,
  status: string,
  expiresAt: string,
  workspaceId: string,
  projectId: string | null,
  invitedById: string,
  createdAt: string,
  updatedAt: string
}

export type InviteToProjectResult =
  | { kind: 'added'; member: ProjectMemberDTO }
  | { kind: 'invited'; invitation: InvitationDTO }
