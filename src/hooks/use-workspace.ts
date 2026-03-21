import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SuccessResponse } from '@/types/http-response'
import type { WorkspaceDTO } from '@/types/workspace'

export function useWorkspace(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async (): Promise<WorkspaceDTO> => {
      const res = await fetch(`/api/workspaces/${workspaceId}`)
      if (!res.ok) throw new Error('Erro ao buscar workspace')
      const json: SuccessResponse<WorkspaceDTO> = await res.json()
      return json.data
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; slug: string }): Promise<WorkspaceDTO> => {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao criar workspace')
      }
      const json: SuccessResponse<WorkspaceDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name?: string; slug?: string }): Promise<WorkspaceDTO> => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao atualizar workspace')
      }
      const json: SuccessResponse<WorkspaceDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
  })
}

export function useDeleteWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao deletar workspace')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}
