import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InvitationDTO } from '@/types/invitation'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const INVITATION_KEY = ['invitations'] as const

export function useInvitations(workspaceId: string | null) {
  return useQuery({
    queryKey: [INVITATION_KEY, workspaceId],
    queryFn: () =>
      apiFetch<InvitationDTO[]>(
        `/api/workspaces/${workspaceId}/invitations`,
        undefined,
        'Erro ao buscar convites',
      ),
    enabled: !!workspaceId,
  })
}

export function useCreateInvitation(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      apiFetchJson<InvitationDTO>(
        `/api/workspaces/${workspaceId}/invitations`,
        'POST',
        data,
        'Erro ao enviar convite',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATION_KEY, workspaceId] })
    },
  })
}

export function useRevokeInvitation(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch(
        `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
        { method: 'DELETE' },
        'Erro ao revogar convite',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATION_KEY, workspaceId] })
    },
  })
}

export function useResendInvitation(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
        { method: 'POST' },
        'Erro ao reenviar convite',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATION_KEY, workspaceId] })
    },
  })
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetchJson<{ workspaceId: string; slug: string }>(
        '/api/invitations/accept',
        'POST',
        { token },
        'Erro ao reenviar convite',
      ),
  })
}
