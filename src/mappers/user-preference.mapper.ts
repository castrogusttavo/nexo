import type { Prisma, UserPreference } from '@prisma/client'
import type { UserPreferenceDTO } from '@/types/user-preference'
import {
  type HomeWidgets,
  HomeWidgetValues,
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
  const known = new Set<string>(ids)
  const seen = new Set<string>()
  const kept = (Array.isArray(stored) ? stored : [])
    .filter(isNavEntry)
    .filter((e) => {
      if (!known.has(e.id) || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    }) as NavEntry<T>[]

  const missing = ids
    .filter((id) => !seen.has(id))
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

export function toHomeWidgets(stored: Prisma.JsonValue | null): HomeWidgets {
  return normalizeSection(stored, HomeWidgetValues)
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
    homeWidgets: toHomeWidgets(p.homeWidgets),
  }
}
