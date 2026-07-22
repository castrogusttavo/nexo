import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LabelColorDTO, LabelDTO } from '@/types/label'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const LABELS_KEY = ['labels']

function labelsKey(workspaceId: string, projectSlug: string) {
  return [LABELS_KEY, workspaceId, projectSlug] as const
}

export function useLabels(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: labelsKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<LabelDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/labels`,
        undefined,
        'Erro ao buscar labels',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateLabel(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      color?: LabelColorDTO
    }) =>
      apiFetchJson<LabelDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/labels`,
        'POST',
        data,
        'Erro ao criar label',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: labelsKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateLabel(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      labelId,
      data,
    }: {
      labelId: string
      data: {
        name?: string
        description?: string
        color?: LabelColorDTO
      }
    }) =>
      apiFetchJson<LabelDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/labels/${labelId}`,
        'PATCH',
        data,
        'Erro ao atualizar label',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: labelsKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteLabel(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/labels/${labelId}`,
        { method: 'DELETE' },
        'Erro ao excluir label',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: labelsKey(workspaceId, projectSlug),
      })
    },
  })
}
