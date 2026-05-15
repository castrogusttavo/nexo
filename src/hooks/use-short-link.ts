import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SuccessResponse } from '@/types/http-response'
import type { ShortLinkDTO } from '@/types/short-link'

export function useShortLinks() {
  return useQuery({
    queryKey: ['short-links'],
    queryFn: async (): Promise<ShortLinkDTO[]> => {
      const res = await fetch('/api/short-links')
      if (!res.ok) throw new Error('Erro ao buscar short links')
      const json: SuccessResponse<ShortLinkDTO[]> = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateShortLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title: string
      url: string
    }): Promise<ShortLinkDTO> => {
      const res = await fetch('/api/short-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao criar short link')
      }
      const json: SuccessResponse<ShortLinkDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-links'] })
    }
  })
}

export function useUpdateShortLink(shortLinkId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title?: string
      url?: string
    }): Promise<ShortLinkDTO> => {
      const res = await fetch(`/api/short-links/${shortLinkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao atualizar short link')
      }
      const json: SuccessResponse<ShortLinkDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-links'] })
    }
  })
}

export function useDeleteShortLink(shortLinkId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch(`/api/short-links/${shortLinkId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao deletar short link')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-links'] })
    }
  })
}
