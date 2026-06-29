import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserDTO } from '@/types/user'
import { authClient } from '../lib/auth-client'
import { apiFetch } from './_fetch'

const USER_KEY = ['user'] as const
const BASE_API_ROUTE = '/api/users/me'

export function useUser() {
  const { data: session } = authClient.useSession()

  return useQuery({
    queryKey: [USER_KEY, session?.user.id],
    queryFn: () =>
      apiFetch<UserDTO>(BASE_API_ROUTE, undefined, 'Erro ao buscar usuário'),
    enabled: !!session?.user.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name?: string
      username?: string
      coverImage?: string
    }) =>
      apiFetch<UserDTO>(
        BASE_API_ROUTE,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao atualizar perfil',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('avatars', file)
      const { url } = await apiFetch<{ url: string }>(
        `${BASE_API_ROUTE}/avatar`,
        { method: 'POST', body: form },
        'Erro ao enviar avatar',
      )
      return url
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useUploadCover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('cover', file)
      const { url } = await apiFetch<{ url: string }>(
        `${BASE_API_ROUTE}/cover`,
        { method: 'POST', body: form },
        'Erro ao enviar capa',
      )
      return url
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ scheduleAt: string }>(
        BASE_API_ROUTE,
        { method: 'DELETE' },
        'Erro ao desativar conta',
      ),
  })
}
