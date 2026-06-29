import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkspaceDTO } from '@/types/workspace'
import { apiFetch, apiSend } from './_fetch'

const WORKSPACE_KEY = ['workspace'] as const
const USER_KEY = ['user'] as const
const BASE_API_ROUTE = '/api/workspaces'

export function useWorkspace(workspaceId: string | null) {
  return useQuery({
    queryKey: [WORKSPACE_KEY, workspaceId],
    queryFn: () =>
      apiFetch<WorkspaceDTO>(
        `${BASE_API_ROUTE}/${workspaceId}`,
        undefined,
        'Erro ao buscar workspace',
      ),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiFetch<WorkspaceDTO>(
        BASE_API_ROUTE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao criar workspace',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name?: string; slug?: string }) =>
      apiFetch<WorkspaceDTO>(
        `${BASE_API_ROUTE}/${workspaceId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao atualizar workspace',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKSPACE_KEY, workspaceId] })
    },
  })
}

export function useDeleteWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiSend(
        `${BASE_API_ROUTE}/${workspaceId}`,
        { method: 'DELETE' },
        'Erro ao deletar workspace',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
    },
  })
}
