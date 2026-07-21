import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { StateColorDTO, StateDTO, StateGroupDTO } from '@/types/state'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const STATES_KEY = ['states']

function statesKey(workspaceId: string, projectSlug: string) {
  return [STATES_KEY, workspaceId, projectSlug] as const
}

export function useStates(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: statesKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<StateDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/states`,
        undefined,
        'Erro ao buscar states',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateState(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      group: StateGroupDTO
      color?: StateColorDTO
    }) =>
      apiFetchJson<StateDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/states`,
        'POST',
        data,
        'Erro ao criar state',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: statesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateState(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      stateId,
      data,
    }: {
      stateId: string
      data: {
        name?: string
        description?: string
        color?: StateColorDTO
        order?: number
      }
    }) =>
      apiFetchJson<StateDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/states/${stateId}`,
        'PATCH',
        data,
        'Erro ao atualizar state',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: statesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteState(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stateId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/states/${stateId}`,
        { method: 'DELETE' },
        'Erro ao excluir state',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: statesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useSetDefaultState(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stateId: string) =>
      apiFetch<StateDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/states/${stateId}/default`,
        { method: 'PATCH' },
        'Erro ao definir state padrão',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: statesKey(workspaceId, projectSlug),
      })
    },
  })
}
