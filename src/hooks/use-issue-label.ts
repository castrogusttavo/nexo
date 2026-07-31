import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueLabelDTO } from '@/types/issue'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUE_LABELS_KEY = ['issue-labels']

function issueLabelsKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [ISSUE_LABELS_KEY, workspaceId, projectSlug, issueId] as const
}

export function useIssueLabels(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: issueLabelsKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<IssueLabelDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/labels`,
        undefined,
        'Erro ao buscar labels da issue',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAddIssueLabel(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: string) =>
      apiFetchJson<IssueLabelDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/labels`,
        'POST',
        { labelId },
        'Erro ao adicionar label',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueLabelsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useRemoveIssueLabel(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (labelId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/labels/${labelId}`,
        { method: 'DELETE' },
        'Erro ao remover label',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: issueLabelsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}
