import type { UserDTO } from '@/types/user'
import { createKeyedCache } from './_cache'

export const UserCache = createKeyedCache<UserDTO>({
  // v2: memberships embed WorkspaceDTO, which gained projectStatesEnabled;
  // see workspace.cache.ts.
  prefix: 'user:v3:',
  ttl: 15 * 60, // 15 min
  name: 'user',
})
