import type { UserDTO } from '@/types/user'
import { createKeyedCache } from './_cache'

export const UserCache = createKeyedCache<UserDTO>({
  // v2: memberships embed WorkspaceDTO, which gained projectStatesEnabled;
  // see workspace.cache.ts.
  // v4: memberships carry the workspace logo (`image`); a v3 entry would
  // read it as undefined and show the letter until the TTL.
  prefix: 'user:v4:',
  ttl: 15 * 60, // 15 min
  name: 'user',
})
