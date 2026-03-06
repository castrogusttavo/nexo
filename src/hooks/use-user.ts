import { useQuery } from '@tanstack/react-query'
import { authClient } from '../lib/auth-client'

async function getUser() {
  const res = await fetch('/api/auth/me')
  if (!res.ok) throw new Error('Erro ao buscar usuário')
  const json = await res.json()
  return json.data
}

export function useUser() {
  const { data: session } = authClient.useSession()

  const query = useQuery({
    queryKey: ['user', session?.user.id],
    queryFn: getUser,
    enabled: !!session?.user.id,
    staleTime: 5 * 60 * 1000,
  })

  return query
}
