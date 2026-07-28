import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  EstimateModelDTO,
  EstimateSettingsDTO,
  EstimateSystemDTO,
  EstimateValueDTO,
} from '@/types/estimate'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ESTIMATE_KEY = ['estimate-settings']

function estimateKey(workspaceId: string, projectSlug: string) {
  return [ESTIMATE_KEY, workspaceId, projectSlug] as const
}

export function useEstimateSettings(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: estimateKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<EstimateSettingsDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/estimate`,
        undefined,
        'Erro ao buscar configurações de estimativa',
      ),
    enabled: !!workspaceId && !!projectSlug,
  })
}

export function useUpdateEstimateSettings(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      system: EstimateSystemDTO
      model: EstimateModelDTO
    }) =>
      apiFetchJson<EstimateSettingsDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/estimate`,
        'PATCH',
        data,
        'Erro ao atualizar configurações de estimativa',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estimateKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useCreateEstimateValue(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { value: string }) =>
      apiFetchJson<EstimateValueDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/estimate/values`,
        'POST',
        data,
        'Erro ao criar valor de estimativa',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estimateKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateEstimateValue(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      valueId,
      data,
    }: {
      valueId: string
      data: { value: string }
    }) =>
      apiFetchJson<EstimateValueDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/estimate/values/${valueId}`,
        'PATCH',
        data,
        'Erro ao atualizar valor de estimativa',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estimateKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteEstimateValue(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (valueId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/estimate/values/${valueId}`,
        { method: 'DELETE' },
        'Erro ao excluir valor de estimativa',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estimateKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useReorderEstimateValues(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (valueIds: string[]) =>
      apiFetchJson<EstimateValueDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/estimate/values/reorder`,
        'PATCH',
        { valueIds },
        'Erro ao reordenar valores de estimativa',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estimateKey(workspaceId, projectSlug),
      })
    },
  })
}
