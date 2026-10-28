import type { Prisma, UserPreference } from '@prisma/client'
import type { UserPreferenceDTO } from '@/types/user-preference'
import {
  PersonalNavItemValues,
  PROJECTS_LIMIT_MAX,
  type SidebarNavigation,
  WorkspaceNavItemValues,
} from '../schemas/user-preference.schema'

type NavEntry<T extends string> = { id: T; visible: boolean }

function isNavEntry(e: unknown): e is NavEntry<string> {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { id?: unknown }).id === 'string' &&
    typeof (e as { visible?: unknown }).visible === 'boolean'
  )
}

// Keeps the stored order of known items, drops unknown and repeated ones,
// and appends any item the code gained since the row was written (visible).
function normalizeSection<T extends string>(
  stored: unknown,
  ids: readonly T[],
): NavEntry<T>[] {
  const known: readonly string[] = ids
  const kept = (Array.isArray(stored) ? stored : [])
    .filter(isNavEntry)
    .filter((e) => known.includes(e.id))
    .filter(
      (e, i, all) => all.findIndex((o) => o.id === e.id) === i,
    ) as NavEntry<T>[]

  const missing = ids
    .filter((id) => !kept.some((e) => e.id === id))
    .map((id) => ({ id, visible: true }))

  return [...kept, ...missing]
}

export function toSidebarNavigation(
  stored: Prisma.JsonValue | null,
): SidebarNavigation {
  const value =
    typeof stored === 'object' && stored !== null && !Array.isArray(stored)
      ? stored
      : {}
  const limit = value.projectsLimit

  return {
    personal: normalizeSection(value.personal, PersonalNavItemValues),
    workspace: normalizeSection(value.workspace, WorkspaceNavItemValues),
    projectsLimit:
      typeof limit === 'number' &&
      Number.isInteger(limit) &&
      limit >= 1 &&
      limit <= PROJECTS_LIMIT_MAX
        ? limit
        : null,
  }
}

export function toUserPreferenceDTO(p: UserPreference): UserPreferenceDTO {
  return {
    theme: p.theme,
    smoothCursor: p.smoothCursor,
    quickSendShortcut: p.quickSendShortcut,
    timezone: p.timezone,
    weekStartsOn: p.weekStartsOn,
    weekendDays: p.weekendDays,
    navigation: toSidebarNavigation(p.navigation),
  }
}
