import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IssueRelationDTO, IssueRelationTypeDTO } from '@/types/issue'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUE_RELATIONS_KEY = ['issue-relations']

function relationsKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [ISSUE_RELATIONS_KEY, workspaceId, projectSlug, issueId] as const
}

export function useIssueRelations(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: relationsKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<IssueRelationDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/relations`,
        undefined,
        'Erro ao buscar relações',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateIssueRelation(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { targetId: string; type: IssueRelationTypeDTO }) =>
      apiFetchJson<IssueRelationDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/relations`,
        'POST',
        data,
        'Erro ao criar relação',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ISSUE_RELATIONS_KEY, workspaceId, projectSlug],
      })
    },
  })
}

export function useRemoveIssueRelation(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (relationId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/relations/${relationId}`,
        { method: 'DELETE' },
        'Erro ao remover relação',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ISSUE_RELATIONS_KEY, workspaceId, projectSlug],
      })
    },
  })
}
