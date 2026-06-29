import type { UserPreferenceDTO } from '@/types/user-preference.factory'
import { createKeyedCache } from './_cache'

export const UserPreferenceCache = createKeyedCache<UserPreferenceDTO>({
  prefix: 'pref:',
  ttl: 15 * 60, // 15 min
  name: 'user_preferences',
})
