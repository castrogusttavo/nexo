import type { UserPreferenceDTO } from '@/types/user-preference'
import { createKeyedCache } from './_cache'

export const UserPreferenceCache = createKeyedCache<UserPreferenceDTO>({
  // v3: the DTO gained `homeWidgets`; v2 entries would reach the home without it
  prefix: 'pref:v3:',
  ttl: 15 * 60, // 15 min
  name: 'user_preferences',
})
