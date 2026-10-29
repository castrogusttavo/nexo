import type { Prisma, UserPreference } from '@prisma/client'
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_SIDEBAR_NAVIGATION,
} from '@/src/schemas/user-preference.schema'
import type { UserPreferenceDTO } from '@/types/user-preference'

export function createFakeUserPreference(
  overrides: Partial<UserPreference> = {},
): UserPreference {
  const now = new Date('2026-06-24T12:00:00.000Z')
  return {
    id: 'pref_123',
    userId: 'user_123',
    theme: 'SYSTEM',
    smoothCursor: false,
    quickSendShortcut: 'ENTER',
    timezone: 'UTC',
    weekStartsOn: 1,
    weekendDays: [0, 6],
    navigation: null,
    homeWidgets: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeUserPreferenceDTO(
  overrides: Partial<UserPreferenceDTO> = {},
): UserPreferenceDTO {
  return {
    theme: 'SYSTEM',
    smoothCursor: false,
    quickSendShortcut: 'ENTER',
    timezone: 'UTC',
    weekStartsOn: 1,
    weekendDays: [0, 6],
    navigation: DEFAULT_SIDEBAR_NAVIGATION,
    homeWidgets: DEFAULT_HOME_WIDGETS,
    ...overrides,
  }
}

export function fakePreferenceInput(
  overrides: Partial<Prisma.UserPreferenceUncheckedCreateInput> = {},
): Prisma.UserPreferenceUncheckedCreateInput {
  return { userId: 'user_123', ...overrides }
}
