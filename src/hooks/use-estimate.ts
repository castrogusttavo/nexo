import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  EstimateModelDTO,
  EstimateSettingsDTO,
  EstimateSystemDTO,
} from '@/types/estimate'
import { apiFetch, apiFetchJson } from './_fetch'

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
