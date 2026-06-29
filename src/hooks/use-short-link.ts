import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ShortLinkDTO } from '@/types/short-link'
import { apiFetch, apiSend } from './_fetch'

const SHORT_LINK_KEY = ['short-links'] as const
const BASE_API_ROUTE = '/api/short-links'

export function useShortLinks() {
  return useQuery({
    queryKey: SHORT_LINK_KEY,
    queryFn: () =>
      apiFetch<ShortLinkDTO[]>(
        BASE_API_ROUTE,
        undefined,
        'Erro ao buscar short links',
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateShortLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { title: string; url: string }) =>
      apiFetch<ShortLinkDTO>(
        BASE_API_ROUTE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao criar short link',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHORT_LINK_KEY })
    },
  })
}

export function useUpdateShortLink(shortLinkId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { title?: string; url?: string }) =>
      apiFetch<ShortLinkDTO>(
        `${BASE_API_ROUTE}/${shortLinkId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao atualizar short link',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHORT_LINK_KEY })
    },
  })
}

export function useDeleteShortLink(shortLinkId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiSend(
        `${BASE_API_ROUTE}/${shortLinkId}`,
        { method: 'DELETE' },
        'Erro ao deletar short link',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHORT_LINK_KEY })
    },
  })
}
