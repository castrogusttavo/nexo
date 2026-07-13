import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkspaceDTO } from '@/types/workspace'
import { apiFetchJson } from './_fetch'

const WORKSPACE_KEY = ['workspace'] as const
const USER_KEY = ['user'] as const
const BASE_API_ROUTE = '/api/workspaces'

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiFetchJson<WorkspaceDTO>(
        BASE_API_ROUTE,
        'POST',
        data,
        'Erro ao criar workspace',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}
