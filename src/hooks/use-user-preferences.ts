import type { Theme } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { authClient } from '../lib/auth-client'
import type { UpdateUserPreferenceDTO } from '../schemas/user-preference.schema'
import { apiFetch } from './_fetch'

const PREFERENCE_KEY = ['user-preferences']
const BASE_API_ROUTE = '/api/users/me/preferences'

export function useUserPreferences() {
  const { data: session } = authClient.useSession()

  return useQuery({
    queryKey: PREFERENCE_KEY,
    queryFn: () =>
      apiFetch<UserPreferenceDTO>(
        BASE_API_ROUTE,
        undefined,
        'Erro ao buscar preferências',
      ),
    enabled: !!session?.user.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserPreferenceDTO) =>
      apiFetch<UserPreferenceDTO>(
        BASE_API_ROUTE,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao salvar preferências',
      ),
    // Optimistic
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCE_KEY })
      const previous =
        queryClient.getQueryData<UserPreferenceDTO>(PREFERENCE_KEY)
      if (previous) {
        queryClient.setQueryData<UserPreferenceDTO>(PREFERENCE_KEY, {
          ...previous,
          ...data,
        })
        if (data.theme) applyTheme(data.theme)
      }
      return { previous }
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(PREFERENCE_KEY, ctx.previous)
        applyTheme(ctx.previous.theme)
      }
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(PREFERENCE_KEY, dto)
    },
  })
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const dark =
    theme === 'DARK' ||
    (theme === 'SYSTEM' &&
      window.matchMedia('(prefers-color-scheme:dark)').matches)
  root.classList.toggle('dark', dark)
}
