import type { Theme } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserPreferenceDTO } from '@/types/user-preference.factory'
import { authClient } from '../lib/auth-client'
import type { UpdateUserPreferenceDTO } from '../schemas/user-preference.schema'

const QUERY_KEY = ['user-preferences']

async function getPreferences(): Promise<UserPreferenceDTO> {
  const res = await fetch('/api/users/me/preferences')
  if (!res.ok) throw new Error('Erro ao buscar preferências')

  return (await res.json()).data as UserPreferenceDTO
}

export function useUserPreferences() {
  const { data: session } = authClient.useSession()

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPreferences,
    enabled: !!session?.user.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      data: UpdateUserPreferenceDTO,
    ): Promise<UserPreferenceDTO> => {
      const res = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message ?? 'Erro ao salvar preferências')
      }
      return (await res.json()).data as UserPreferenceDTO
    },
    // Optimistic
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<UserPreferenceDTO>(QUERY_KEY)
      if (previous) {
        queryClient.setQueryData<UserPreferenceDTO>(QUERY_KEY, {
          ...previous,
          ...data,
        })
        if (data.theme) applyTheme(data.theme)
      }
      return { previous }
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous)
        applyTheme(ctx.previous.theme)
      }
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(QUERY_KEY, dto)
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
