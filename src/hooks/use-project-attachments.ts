import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectAttachmentDTO } from '@/types/project-attachment'
import { apiFetch, apiSend } from './_fetch'

export function projectAttachmentsKey(workspaceId: string, slug: string) {
  return ['project-attachments', workspaceId, slug] as const
}

const baseUrl = (workspaceId: string, slug: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/attachments`

export function useProjectAttachments(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectAttachmentsKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectAttachmentDTO[]>(
        baseUrl(workspaceId, slug),
        undefined,
        'Erro ao buscar anexos',
      ),
    enabled: !!workspaceId && !!slug,
    staleTime: 30 * 60 * 1000,
  })
}

export function useUploadProjectAttachment(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)

      return apiFetch<ProjectAttachmentDTO>(
        baseUrl(workspaceId, slug),
        { method: 'POST', body: form },
        'Erro ao enviar anexo',
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectAttachmentsKey(workspaceId, slug),
      })
    },
  })
}

export function useRemoveProjectAttachment(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => {
      return apiSend(
        `${baseUrl(workspaceId, slug)}/${attachmentId}`,
        { method: 'DELETE' },
        'Erro ao remover anexo',
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectAttachmentsKey(workspaceId, slug),
      })
    },
  })
}
