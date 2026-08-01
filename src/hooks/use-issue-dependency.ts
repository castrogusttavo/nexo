import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueDependencyDTO, IssueDependencyTypeDTO } from '@/types/issue'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUE_DEPENDENCIES_KEY = ['issue-dependencies']

function dependenciesKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [ISSUE_DEPENDENCIES_KEY, workspaceId, projectSlug, issueId] as const
}

export function useIssueDependencies(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: dependenciesKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<IssueDependencyDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/dependencies`,
        undefined,
        'Erro ao buscar dependências',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateIssueDependency(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { targetId: string; type: IssueDependencyTypeDTO }) =>
      apiFetchJson<IssueDependencyDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/dependencies`,
        'POST',
        data,
        'Erro ao criar dependência',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ISSUE_DEPENDENCIES_KEY, workspaceId, projectSlug],
      })
    },
  })
}

export function useRemoveIssueDependency(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dependencyId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/dependencies/${dependencyId}`,
        { method: 'DELETE' },
        'Erro ao remover dependência',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ISSUE_DEPENDENCIES_KEY, workspaceId, projectSlug],
      })
    },
  })
}
