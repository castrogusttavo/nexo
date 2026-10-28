import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserDTO } from '@/types/user'
import { authClient } from '../lib/auth-client'
import { apiFetch, apiFetchJson } from './_fetch'

const USER_KEY = ['user'] as const
const BASE_API_ROUTE = '/api/users/me'

export function useUser() {
  const { data: session } = authClient.useSession()

  return useQuery({
    // Spread, not nested: the mutations here (and useCreateWorkspace)
    // invalidate by the `['user']` prefix, which a nested `[['user'], id]`
    // key never matched — the profile stayed stale after every update.
    queryKey: [...USER_KEY, session?.user.id],
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
      apiFetchJson<UserDTO>(
        BASE_API_ROUTE,
        'PATCH',
        data,
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<{ scheduleAt: string }>(
        BASE_API_ROUTE,
        { method: 'DELETE' },
        'Erro ao desativar conta',
      ),
    // The cached user still says no deletion is scheduled.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

// Lifts a scheduled deletion while the grace period is still running; the
// refreshed user drops `deletionScheduledAt`.
export function useCancelAccountDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<{ canceled: boolean }>(
        `${BASE_API_ROUTE}/deletion`,
        { method: 'DELETE' },
        'Erro ao cancelar a exclusão',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}
