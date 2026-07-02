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
