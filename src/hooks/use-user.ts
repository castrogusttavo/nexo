import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SuccessResponse } from '@/types/http-response'
import type { UserDTO } from '@/types/user'
import { authClient } from '../lib/auth-client'

async function getUser(): Promise<UserDTO> {
  const res = await fetch('/api/users/me')
  if (!res.ok) throw new Error('Erro ao buscar usuário')
  const json = await res.json()
  return json.data as UserDTO
}

export function useUser() {
  const { data: session } = authClient.useSession()

  return useQuery({
    queryKey: ['user', session?.user.id],
    queryFn: getUser,
    enabled: !!session?.user.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name?: string
      username?: string
      coverImage?: string
    }): Promise<UserDTO> => {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao atualizar perfil')
      }
      const json: SuccessResponse<UserDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('avatars', file)
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao enviar avatar')
      }
      const json: SuccessResponse<{ url: string }> = await res.json()
      return json.data.url
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useUploadCover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('cover', file)
      const res = await fetch('/api/users/me/cover', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao enviar capa')
      }
      const json: SuccessResponse<{ url: string }> = await res.json()
      return json.data.url
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (): Promise<{ scheduleAt: string }> => {
      const res = await fetch('/api/users/me', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao desativar conta')
      }
      const json: SuccessResponse<{ scheduleAt: string }> = await res.json()
      return json.data
    },
  })
}
