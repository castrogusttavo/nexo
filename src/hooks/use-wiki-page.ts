import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Value } from 'platejs'
import type { WikiPageDTO } from '@/types/wiki-page'
import { apiFetch, apiFetchJson } from './_fetch'

function wikiPagesKey(workspaceId: string) {
  return ['wiki-pages', workspaceId] as const
}

function baseRoute(workspaceId: string) {
  return `/api/workspaces/${workspaceId}/wiki`
}

export function useWikiPages(workspaceId: string) {
  return useQuery({
    queryKey: wikiPagesKey(workspaceId),
    queryFn: () =>
      apiFetch<WikiPageDTO[]>(
        baseRoute(workspaceId),
        undefined,
        'Erro ao buscar páginas de wiki',
      ),
    staleTime: 60 * 1000,
  })
}

export function useCreateWikiPage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { title?: string; parentId?: string; icon?: string }) =>
      apiFetchJson<WikiPageDTO>(
        baseRoute(workspaceId),
        'POST',
        data,
        'Erro ao criar página',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wikiPagesKey(workspaceId) })
    },
  })
}

export function useUpdateWikiPage(workspaceId: string, wikiPageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      title?: string
      icon?: string | null
      coverImage?: string | null
      content?: Value
    }) =>
      apiFetchJson<WikiPageDTO>(
        `${baseRoute(workspaceId)}/${wikiPageId}`,
        'PATCH',
        data,
        'Erro ao salvar página',
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<WikiPageDTO[]>(
        wikiPagesKey(workspaceId),
        (old) => old?.map((p) => (p.id === updated.id ? updated : p)),
      )
    },
  })
}

export function useArchiveWikiPage(workspaceId: string, wikiPageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetchJson<WikiPageDTO>(
        `${baseRoute(workspaceId)}/${wikiPageId}/archive`,
        'PATCH',
        {},
        'Erro ao arquivar página',
      ),
    onSuccess: (_updated, _vars) => {
      queryClient.setQueryData<WikiPageDTO[]>(
        wikiPagesKey(workspaceId),
        (old) => old?.filter((p) => p.id !== wikiPageId),
      )
    },
  })
}
