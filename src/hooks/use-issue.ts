'use client'

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { Value } from 'platejs'
import { useEffect, useMemo } from 'react'
import type { IssueDTO, IssuePriorityDTO } from '@/types/issue'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const ISSUES_KEY = ['issues']
const ISSUES_PAGE_LIMIT = 1000

export function issuesKey(workspaceId: string, projectSlug: string) {
  return [ISSUES_KEY, workspaceId, projectSlug] as const
}

type IssuesPage = { items: IssueDTO[]; nextCursor: number | null }

export function useIssues(workspaceId: string, projectSlug: string) {
  const query = useInfiniteQuery({
    queryKey: issuesKey(workspaceId, projectSlug),
    queryFn: ({ pageParam }) =>
      apiFetch<IssuesPage>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues?limit=${ISSUES_PAGE_LIMIT}${
          pageParam ? `&cursor=${pageParam}` : ''
        }`,
        undefined,
        'Erro ao buscar issues',
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const data = useMemo(
    () => query.data?.pages.flatMap((page) => page.items),
    [query.data],
  )

  return { ...query, data }
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
