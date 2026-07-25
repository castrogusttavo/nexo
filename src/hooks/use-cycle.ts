import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CycleDTO, CycleMemberDTO, CycleStatusDTO } from '@/types/cycle'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const CYCLES_KEY = ['cycles']

function cyclesKey(workspaceId: string, projectSlug: string) {
  return [CYCLES_KEY, workspaceId, projectSlug] as const
}

function cyclesMembersKey(
  workspaceId: string,
  projectSlug: string,
  cycleId: string,
) {
  return [CYCLES_KEY, workspaceId, projectSlug, cycleId, 'members'] as const
}

export function useCycles(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: cyclesKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<CycleDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles`,
        undefined,
        'Erro ao buscar ciclos',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateCycle(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      status?: CycleStatusDTO
      startDate?: string
      endDate?: string
    }) =>
      apiFetchJson<CycleDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles`,
        'POST',
        data,
        'Erro ao criar ciclo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cyclesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateCycle(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cycleId,
      data,
    }: {
      cycleId: string
      data: {
        name?: string
        description?: string | null
        status?: CycleStatusDTO
        startDate?: string | null
        endDate?: string | null
      }
    }) =>
      apiFetchJson<CycleDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles/${cycleId}`,
        'PATCH',
        data,
        'Erro ao atualziar ciclo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cyclesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteCycle(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (cycleId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles/${cycleId}`,
        { method: 'DELETE' },
        'Erro ao excluir ciclo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cyclesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useCycleMembers(
  workspaceId: string,
  projectSlug: string,
  cycleId: string,
) {
  return useQuery({
    queryKey: cyclesMembersKey(workspaceId, projectSlug, cycleId),
    queryFn: () =>
      apiFetch<CycleMemberDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles/${cycleId}/members`,
        undefined,
        'Erro ao buscar memberos do ciclos',
      ),
    enabled: !!workspaceId && !!projectSlug && !!cycleId,
  })
}

export function useAddCycleMember(
  workspaceId: string,
  projectSlug: string,
  cycleId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetchJson<CycleMemberDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles/${cycleId}/members`,
        'POST',
        { userId },
        'Erro ao adicionar membro ao ciclo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cyclesMembersKey(workspaceId, projectSlug, cycleId),
      })
    },
  })
}

export function useRemoveCyclemember(
  workspaceId: string,
  projectSlug: string,
  cycleId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/cycles/${cycleId}/members/${userId}`,
        { method: 'DELETE' },
        'Erro ao remover membro ao ciclo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cyclesMembersKey(workspaceId, projectSlug, cycleId),
      })
    },
  })
}
