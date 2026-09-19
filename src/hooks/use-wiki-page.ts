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
    enabled: !!workspaceId,
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

function withoutSubtree(pages: WikiPageDTO[], rootId: string) {
  const removed = new Set([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const page of pages) {
      if (
        page.parentId &&
        removed.has(page.parentId) &&
        !removed.has(page.id)
      ) {
        removed.add(page.id)
        grew = true
      }
    }
  }
  return pages.filter((page) => !removed.has(page.id))
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
    // The server archives the whole subtree, so drop the descendants too.
    onSuccess: () => {
      queryClient.setQueryData<WikiPageDTO[]>(
        wikiPagesKey(workspaceId),
        (old) => old && withoutSubtree(old, wikiPageId),
      )
    },
  })
}
