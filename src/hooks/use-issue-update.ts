import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueUpdateDTO, IssueUpdateStatusDTO } from '@/types/issue-update'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUE_UPDATES_KEY = ['issue-updates']

function issueUpdateKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [ISSUE_UPDATES_KEY, workspaceId, projectSlug, issueId] as const
}

export function useIssueUpdates(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: issueUpdateKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<IssueUpdateDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/updates`,
        undefined,
        'Erro ao buscar updates',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateIssueUpdate(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { status: IssueUpdateStatusDTO; content?: string }) =>
      apiFetchJson<IssueUpdateDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/updates`,
        'POST',
        data,
        'Erro ao postar update',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueUpdateKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useEditIssueUpdate(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      updateId,
      data,
    }: {
      updateId: string
      data: { status: IssueUpdateStatusDTO; content?: string }
    }) =>
      apiFetchJson<IssueUpdateDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/updates/${updateId}`,
        'PATCH',
        data,
        'Erro ao editar update',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueUpdateKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useDeleteIssueUpdate(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updateId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/updates/${updateId}`,
        { method: 'DELETE' },
        'Erro ao excluir update',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueUpdateKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}
