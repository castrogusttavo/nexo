import type { UserDTO } from '@/types/user'
import { createKeyedCache } from './_cache'

export const UserCache = createKeyedCache<UserDTO>({
  prefix: 'user:',
  ttl: 15 * 60, // 15 min
  name: 'user',
})
