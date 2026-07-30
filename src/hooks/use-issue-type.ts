import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueTypeDTO } from '@/types/issue-type'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUE_TYPES_KEY = ['issue-types']

function issueTypesKey(workspaceId: string, projectSlug: string) {
  return [ISSUE_TYPES_KEY, workspaceId, projectSlug] as const
}

export function useIssueTypes(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: issueTypesKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<IssueTypeDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issue-types`,
        undefined,
        'Erro ao buscar tipos de issue',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateIssueType(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      color?: IssueTypeDTO['color']
      icon: string
    }) =>
      apiFetchJson<IssueTypeDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issue-types`,
        'POST',
        data,
        'Erro ao criar tipo de issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueTypesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateIssueType(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      typeId,
      data,
    }: {
      typeId: string
      data: {
        name?: string
        description?: string
        color?: IssueTypeDTO['color']
        icon?: string
      }
    }) =>
      apiFetchJson<IssueTypeDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issue-types/${typeId}`,
        'PATCH',
        data,
        'Erro ao atualizar tipo de issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueTypesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteIssueType(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (typeId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issue-types/${typeId}`,
        { method: 'DELETE' },
        'Erro ao excluir tipo de issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueTypesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useReorderIssueTypes(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (typeIds: string[]) =>
      apiFetchJson<IssueTypeDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issue-types/reorder`,
        'PATCH',
        { typeIds },
        'Erro ao reordenar tipo de issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueTypesKey(workspaceId, projectSlug),
      })
    },
  })
}
