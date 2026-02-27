import { authClient } from '@/src/lib/auth-client'

export function useCacheUser() {
  return authClient.useSession()
}
