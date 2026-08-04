import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AttachmentDTO } from '@/types/attachment'
import { apiFetch, apiSend } from './_fetch'

const ATTACHMENTS_KEY = ['attachments']

function attachmentsKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [ATTACHMENTS_KEY, workspaceId, projectSlug, issueId] as const
}

export function useAttachments(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: attachmentsKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<AttachmentDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/attachments`,
        undefined,
        'Erro ao buscar anexos',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    // Presigned URLs expire in 1h; refetch well before that so a stale
    // list never hands the user a dead link
    staleTime: 30 * 60 * 1000,
  })
}

export function useUploadAttachment(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)

      return apiFetch<AttachmentDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/attachments`,
        { method: 'POST', body: form },
        'Erro ao enviar anexo',
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useRemoveAttachment(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => {
      return apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/attachments/${attachmentId}`,
        { method: 'DELETE' },
        'Erro ao remover anexo',
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}
