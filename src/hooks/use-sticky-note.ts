import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { JSONContent } from '@tiptap/react'
import type { StickyColorDTO, StickyNoteDTO } from '@/types/sticky-note'
import { apiFetch, apiSend } from './_fetch'

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
      apiFetch<StickyNoteDTO>(
        BASE_API_ROUTE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
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
      apiFetch<StickyNoteDTO>(
        `${BASE_API_ROUTE}/${stickyNoteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
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

export function useDeleteStickyNote(stickyNoteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiSend(
        `${BASE_API_ROUTE}/${stickyNoteId}`,
        { method: 'DELETE' },
        'Erro ao deletar sticky',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STICKY_NOTES_KEY })
    },
  })
}
