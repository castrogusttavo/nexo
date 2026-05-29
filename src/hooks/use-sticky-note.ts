import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { JSONContent } from '@tiptap/react'
import type { SuccessResponse } from '@/types/http-response'
import type { StickyColorDTO, StickyNoteDTO } from '@/types/sticky-note'

const STICKY_NOTES_KEY = ['sticky-notes'] as const

export function useStickyNotes() {
  return useQuery({
    queryKey: STICKY_NOTES_KEY,
    queryFn: async (): Promise<StickyNoteDTO[]> => {
      const res = await fetch('/api/sticky-notes')
      if (!res.ok) throw new Error('Erro ao buscar stickies')
      const json: SuccessResponse<StickyNoteDTO[]> = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateStickyNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<StickyNoteDTO> => {
      const res = await fetch('/api/sticky-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao criar sticky')
      }
      const json: SuccessResponse<StickyNoteDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STICKY_NOTES_KEY })
    },
  })
}

export function useUpdateStickyNote(stickyNoteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      content?: JSONContent
      color?: StickyColorDTO
    }): Promise<StickyNoteDTO> => {
      const res = await fetch(`/api/sticky-notes/${stickyNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao atualizar sticky')
      }
      const json: SuccessResponse<StickyNoteDTO> = await res.json()
      return json.data
    },
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
    mutationFn: async (): Promise<void> => {
      const res = await fetch(`/api/sticky-notes/${stickyNoteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao deletar sticky')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STICKY_NOTES_KEY })
    },
  })
}
