import type { UserPreference } from '@prisma/client'
import type { UserPreferenceDTO } from '@/types/user-preference'

export function toUserPreferenceDTO(p: UserPreference): UserPreferenceDTO {
  return {
    theme: p.theme,
    smoothCursor: p.smoothCursor,
    quickSendShortcut: p.quickSendShortcut,
    timezone: p.timezone,
    weekStartsOn: p.weekStartsOn,
    weekendDays: p.weekendDays,
  }
}
