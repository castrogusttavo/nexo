import type { UserPreferenceDTO } from '@/types/user-preference'
import { createKeyedCache } from './_cache'

export const UserPreferenceCache = createKeyedCache<UserPreferenceDTO>({
  // v2: the DTO gained `navigation`; v1 entries would reach the sidebar
  prefix: 'pref:v2:',
  ttl: 15 * 60, // 15 min
  name: 'user_preferences',
})
