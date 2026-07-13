import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { JSONContent } from '@tiptap/react'
import type { StickyColorDTO, StickyNoteDTO } from '@/types/sticky-note'
import { apiFetch, apiFetchJson } from './_fetch'

const STICKY_NOTES_KEY = ['sticky-notes'] as const
const BASE_API_ROUTE = '/api/sticky-notes'

export function useStickyNotes() {
  return useQuery({
    queryKey: STICKY_NOTES_KEY,
    queryFn: () =>
      apiFetch<StickyNoteDTO[]>(
        BASE_API_ROUTE,
        undefined,
        'Erro ao buscar stickies',
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateStickyNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetchJson<StickyNoteDTO>(
        BASE_API_ROUTE,
        'POST',
        {},
        'Erro ao criar sticky',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STICKY_NOTES_KEY })
    },
  })
}

export function useUpdateStickyNote(stickyNoteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { content?: JSONContent; color?: StickyColorDTO }) =>
      apiFetchJson<StickyNoteDTO>(
        `${BASE_API_ROUTE}/${stickyNoteId}`,
        'PATCH',
        data,
        'Erro ao atualizar sticky',
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<StickyNoteDTO[]>(STICKY_NOTES_KEY, (old) => {
        if (!old) return old
        return old
          .map((n) => (n.id === updated.id ? updated : n))
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )
      })
    },
  })
}
