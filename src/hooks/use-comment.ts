import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CommentDTO } from '@/types/comment'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const COMMENTS_KEY = ['comments']

function commentsKey(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return [COMMENTS_KEY, workspaceId, projectSlug, issueId] as const
}

export function useComments(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  return useQuery({
    queryKey: commentsKey(workspaceId, projectSlug, issueId),
    queryFn: () =>
      apiFetch<CommentDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/comments`,
        undefined,
        'Erro ao buscar comentários',
      ),
    enabled: !!workspaceId && !!projectSlug && !!issueId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateComment(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      content: Record<string, unknown>
      parentId?: string
    }) =>
      apiFetchJson<CommentDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/comments`,
        'POST',
        data,
        'Erro ao comentar',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useUpdateComment(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string
      content: Record<string, unknown>
    }) =>
      apiFetchJson<CommentDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/comments/${commentId}`,
        'PATCH',
        { content },
        'Erro ao editar comentário',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}

export function useDeleteComment(
  workspaceId: string,
  projectSlug: string,
  issueId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues/${issueId}/comments/${commentId}`,
        { method: 'DELETE' },
        'Erro ao excluir comentário',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsKey(workspaceId, projectSlug, issueId),
      })
    },
  })
}
