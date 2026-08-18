import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Value } from 'platejs'
import type { IssueDTO, IssuePriorityDTO } from '@/types/issue'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUES_KEY = ['issues']

export function issuesKey(workspaceId: string, projectSlug: string) {
  return [ISSUES_KEY, workspaceId, projectSlug] as const
}

export function useIssues(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: issuesKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<IssueDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues`,
        undefined,
        'Erro ao buscar issues',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateIssue(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      title: string
      description: Value
      stateId: string
      priority?: IssuePriorityDTO
      startDate?: string
      dueDate?: string
      typeId?: string
      cycleId?: string
      moduleId?: string
      estimateValueId?: string
      parentId?: string
    }) =>
      apiFetchJson<IssueDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues`,
        'POST',
        data,
        'Erro ao criar issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issuesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateIssue(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      issueId,
      data,
    }: {
      issueId: string
      data: {
        title?: string
        description?: Value
        stateId?: string
        priority?: IssuePriorityDTO
        startDate?: string | null
        dueDate?: string | null
        typeId?: string
        cycleId?: string | null
        moduleId?: string | null
        estimateValueId?: string | null
        parentId?: string | null
      }
    }) =>
      apiFetchJson<IssueDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}`,
        'PATCH',
        data,
        'Erro ao atualizar issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issuesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteIssue(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (issueId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}`,
        { method: 'DELETE' },
        'Erro ao excluir issue',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issuesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useIssueChildren(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: [...issuesKey(workspaceId, projectSlug), issueId, 'children'],
    queryFn: () =>
      apiFetch<IssueDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/children`,
        undefined,
        'Erro ao buscar sub-issues',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useIssueByIdentifier(
  workspaceId: string,
  projectSlug: string,
  identifier: string | undefined,
) {
  return useQuery({
    queryKey: [
      ...issuesKey(workspaceId, projectSlug),
      'by-identifier',
      identifier,
    ],
    queryFn: () =>
      apiFetch<IssueDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/by-identifier/${identifier}`,
        undefined,
        'Erro ao buscar issue',
      ),
    enabled: !!workspaceId && !!projectSlug && !!identifier,
    staleTime: 2 * 60 * 1000,
  })
}
