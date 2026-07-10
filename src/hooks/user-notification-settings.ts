import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationSettingDTO } from '@/types/notification-setting'
import { authClient } from '../lib/auth-client'
import type { UpdateNotificationSettingDTO } from '../schemas/notification-settings.schema'
import { apiFetch } from './_fetch'

const NOTIFICATION_KEY = ['notification-settings']
const BASE_API_ROUTE = '/api/users/me/notifications'

export function useNotificationSettings() {
  const { data: session } = authClient.useSession()

  return useQuery({
    queryKey: NOTIFICATION_KEY,
    queryFn: () =>
      apiFetch<NotificationSettingDTO>(
        BASE_API_ROUTE,
        undefined,
        'Erro ao buscar notificações',
      ),
    enabled: !!session?.user.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateNotificationSettingDTO) =>
      apiFetch<NotificationSettingDTO>(
        BASE_API_ROUTE,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao salvar notificações',
      ),
    // Optimistic
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEY })
      const previous =
        queryClient.getQueryData<NotificationSettingDTO>(NOTIFICATION_KEY)
      if (previous) {
        queryClient.setQueryData<NotificationSettingDTO>(NOTIFICATION_KEY, {
          ...previous,
          ...data,
        })
      }
      return { previous }
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(NOTIFICATION_KEY, ctx.previous)
      }
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(NOTIFICATION_KEY, dto)
    },
  })
}
