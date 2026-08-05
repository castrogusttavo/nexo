import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueVoteSummaryDTO, IssueVoteTypeDTO } from '@/types/issue'
import { apiFetch, apiFetchJson } from './_fetch'

const ISSUE_VOTES_KEY = ['issue-votes']

function votesKey(workspaceId: string, projectSlug: string, issueId: string) {
  return [ISSUE_VOTES_KEY, workspaceId, projectSlug, issueId] as const
}

export function useIssueVotes(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: votesKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<IssueVoteSummaryDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/votes`,
        undefined,
        'Erro ao buscar votos',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCastIssueVote(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (type: IssueVoteTypeDTO) =>
      apiFetchJson<IssueVoteSummaryDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/votes`,
        'POST',
        { type },
        'Erro ao votar',
      ),
    onSuccess: (summary) => {
      queryClient.setQueryData(
        votesKey(workspaceId, projectSlug, issueId),
        summary,
      )
    },
  })
}

export function useRetractIssueVote(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetchJson<IssueVoteSummaryDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/votes`,
        'DELETE',
        undefined,
        'Erro ao remover voto',
      ),
    onSuccess: (summary) => {
      queryClient.setQueryData(
        votesKey(workspaceId, projectSlug, issueId),
        summary,
      )
    },
  })
}
