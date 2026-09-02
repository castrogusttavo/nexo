import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Value } from 'platejs'
import type { WikiCommentDTO } from '@/types/wiki-comment'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

function wikiCommentsKey(workspaceId: string, wikiPageId: string) {
  return ['wiki-comments', workspaceId, wikiPageId] as const
}

function baseRoute(workspaceId: string, wikiPageId: string) {
  return `/api/workspaces/${workspaceId}/wiki/${wikiPageId}/comments`
}

export function useWikiComments(workspaceId: string, wikiPageId: string) {
  return useQuery({
    queryKey: wikiCommentsKey(workspaceId, wikiPageId),
    queryFn: () =>
      apiFetch<WikiCommentDTO[]>(
        baseRoute(workspaceId, wikiPageId),
        undefined,
        'Erro ao buscar comentários',
      ),
    enabled: !!workspaceId && !!wikiPageId,
    staleTime: 30 * 1000,
  })
}

export function useCreateWikiComment(workspaceId: string, wikiPageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { markId: string; content: Value; parentId?: string }) =>
      apiFetchJson<WikiCommentDTO>(
        baseRoute(workspaceId, wikiPageId),
        'POST',
        data,
        'Erro ao comentar',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wikiCommentsKey(workspaceId, wikiPageId),
      })
    },
  })
}

export function useUpdateWikiComment(workspaceId: string, wikiPageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string
      content: Value
    }) =>
      apiFetchJson<WikiCommentDTO>(
        `${baseRoute(workspaceId, wikiPageId)}/${commentId}`,
        'PATCH',
        { content },
        'Erro ao editar comentário',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wikiCommentsKey(workspaceId, wikiPageId),
      })
    },
  })
}

export function useResolveWikiComment(workspaceId: string, wikiPageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      resolved,
    }: {
      commentId: string
      resolved: boolean
    }) =>
      apiFetchJson<WikiCommentDTO>(
        `${baseRoute(workspaceId, wikiPageId)}/${commentId}/resolve`,
        'PATCH',
        { resolved },
        'Erro ao atualizar a discussão',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wikiCommentsKey(workspaceId, wikiPageId),
      })
    },
  })
}

export function useDeleteWikiComment(workspaceId: string, wikiPageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) =>
      apiSend(
        `${baseRoute(workspaceId, wikiPageId)}/${commentId}`,
        { method: 'DELETE' },
        'Erro ao excluir comentário',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: wikiCommentsKey(workspaceId, wikiPageId),
      })
    },
  })
}

export { wikiCommentsKey }
