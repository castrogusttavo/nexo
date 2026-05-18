import { useQuery } from '@tanstack/react-query'
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
