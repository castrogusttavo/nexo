import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ProjectStateDTO,
  ProjectStateGroupDTO,
} from '@/types/project-state'
import type { StateColorDTO } from '@/types/state'
import { apiFetch, apiFetchJson } from './_fetch'
import { projectsKey } from './use-project'

const PROJECT_STATES_KEY = ['project-states']

function projectStatesKey(workspaceId: string) {
  return [PROJECT_STATES_KEY, workspaceId] as const
}

const baseUrl = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/project-states`

export function useProjectStates(workspaceId: string) {
  return useQuery({
    queryKey: projectStatesKey(workspaceId),
    queryFn: () =>
      apiFetch<ProjectStateDTO[]>(
        baseUrl(workspaceId),
        undefined,
        'Erro ao buscar estados de projeto',
      ),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateProjectState(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      group: ProjectStateGroupDTO
      color?: StateColorDTO
    }) =>
      apiFetchJson<ProjectStateDTO>(
        baseUrl(workspaceId),
        'POST',
        data,
        'Erro ao criar estado de projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectStatesKey(workspaceId),
      })
    },
  })
}

export function useUpdateProjectState(workspaceId: string) {
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
      apiFetchJson<ProjectStateDTO>(
        `${baseUrl(workspaceId)}/${stateId}`,
        'PATCH',
        data,
        'Erro ao atualizar estado de projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectStatesKey(workspaceId),
      })
    },
  })
}

// The response says where the state's projects went and how many, for the
// caller's toast; those projects changed state, so their lsits go stale too.
export function useDeleteProjectState(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stateId: string) =>
      apiFetch<{ movedTo: string; count: number }>(
        `${baseUrl(workspaceId)}/${stateId}`,
        { method: 'DELETE' },
        'Erro ao excluir estado de projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectStatesKey(workspaceId),
      })
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
    },
  })
}

// A new default only applies to projects created from now on, so the
// project lists stay valid.
export function useSetDefaultProjectState(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stateId: string) =>
      apiFetch<ProjectStateDTO>(
        `${baseUrl(workspaceId)}/${stateId}/default`,
        { method: 'PATCH' },
        'Erro ao definir estado padrão',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectStatesKey(workspaceId),
      })
    },
  })
}
