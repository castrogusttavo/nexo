import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectLabelDTO } from '@/types/project-label'
import type { StateColorDTO } from '@/types/state'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'
import { projectsKey } from './use-project'

const PROJECT_LABELS_KEY = ['project-labels']

function projectLabelsKey(workspaceId: string) {
  return [PROJECT_LABELS_KEY, workspaceId] as const
}

const baseUrl = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/project-labels`

export function useProjectLabels(workspaceId: string) {
  return useQuery({
    queryKey: projectLabelsKey(workspaceId),
    queryFn: () =>
      apiFetch<ProjectLabelDTO[]>(
        baseUrl(workspaceId),
        undefined,
        'Erro ao buscar etiquetas de projeto',
      ),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateProjectLabel(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      color?: StateColorDTO
    }) =>
      apiFetchJson<ProjectLabelDTO>(
        baseUrl(workspaceId),
        'POST',
        data,
        'Erro ao criar etiqueta de projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectLabelsKey(workspaceId),
      })
    },
  })
}

export function useUpdateProjectLabel(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      labelId,
      data,
    }: {
      labelId: string
      data: { name?: string; description?: string; color?: StateColorDTO }
    }) =>
      apiFetchJson<ProjectLabelDTO>(
        `${baseUrl(workspaceId)}/${labelId}`,
        'PATCH',
        data,
        'Erro ao atualizar etiqueta de projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectLabelsKey(workspaceId),
      })
    },
  })
}

export function useDeleteProjectLabel(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: string) =>
      apiSend(
        `${baseUrl(workspaceId)}/${labelId}`,
        { method: 'DELETE' },
        'Erro ao atualizar etiqueta de projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectLabelsKey(workspaceId),
      })
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
    },
  })
}
