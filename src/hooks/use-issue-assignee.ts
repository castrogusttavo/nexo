import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueAssigneeDTO } from '@/types/issue'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUE_ASSIGNEES_KEY = ['issue-assignees']

function assigneesKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [ISSUE_ASSIGNEES_KEY, workspaceId, projectSlug, issueId] as const
}

export function useIssueAssignees(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: assigneesKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<IssueAssigneeDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/assignees`,
        undefined,
        'Erro ao buscar responsáveis',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAssignIssue(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetchJson<IssueAssigneeDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/assignees`,
        'POST',
        { userId },
        'Erro ao atribuir responsável',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assigneesKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useUnassignIssue(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/assignees/${userId}`,
        { method: 'DELETE' },
        'Erro ao remover responsável',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assigneesKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useSubscribeIssue(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useMutation({
    mutationFn: () =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/subscribe`,
        { method: 'POST' },
        'Erro ao se inscrever na issue',
      ),
  })
}

export function useUnsubscribeIssue(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useMutation({
    mutationFn: () =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/subscribe`,
        { method: 'DELETE' },
        'Erro ao cancelar inscrição na issue',
      ),
  })
}
