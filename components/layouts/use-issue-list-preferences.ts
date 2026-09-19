'use client'

import { useSyncExternalStore } from "react"
import { issueListPreferencesStorage } from "./issue-list-preferences-storage"

const ISSUE_GROUP_BY = [
  'state',
  'priority',
  'cycle',
  'module',
  'labels',
  'assignees',
  'created-by',
  'none',
] as const

export type IssueGroupBy = (typeof ISSUE_GROUP_BY)[number]

const ISSUE_SORT_BY = [
  'manual',
  'created-at',
  'updated-at',
  'start-date',
  'due-date',
  'priority',
] as const

export type IssueSortBy = (typeof ISSUE_SORT_BY)[number]

interface IssueListPreferences {
  groupBy: IssueGroupBy
  sortBy: IssueSortBy
  showSubIssues: boolean
  showEmptyGroups: boolean
}

const DEFAULT_PREFERENCES: IssueListPreferences = {
  groupBy: 'state',
  sortBy: 'manual',
  showSubIssues: true,
  showEmptyGroups: true,
}

const STORAGE_KEY = 'preferences'

const listeners = new Set<() => void>()

let cachedSnapshot: IssueListPreferences | null = null

function isOneOf<T extends string>(
  options: readonly T[],
  value: unknown,
): value is T {
  return options.includes(value as T)
}

// Stored preferences outlive releases: a field added later is missing from
// older saves, and an option can be renamed or removed. Keep each stored
// value only if it is still valid, falling back to the default per field.
function withDefaults(stored: unknown): IssueListPreferences {
  const s = (stored ?? {}) as Partial<Record<keyof IssueListPreferences, unknown>>
  return {
    groupBy: isOneOf(ISSUE_GROUP_BY, s.groupBy)
      ? s.groupBy
      : DEFAULT_PREFERENCES.groupBy,
    sortBy: isOneOf(ISSUE_SORT_BY, s.sortBy)
      ? s.sortBy
      : DEFAULT_PREFERENCES.sortBy,
    showSubIssues:
      typeof s.showSubIssues === 'boolean'
        ? s.showSubIssues
        : DEFAULT_PREFERENCES.showSubIssues,
    showEmptyGroups:
      typeof s.showEmptyGroups === 'boolean'
        ? s.showEmptyGroups
        : DEFAULT_PREFERENCES.showEmptyGroups,
  }
}

function readSnapshot(): IssueListPreferences {
  if (cachedSnapshot === null) {
    cachedSnapshot = withDefaults(
      issueListPreferencesStorage.getOrInit(STORAGE_KEY, () => DEFAULT_PREFERENCES),
    )
  }
  return cachedSnapshot
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): IssueListPreferences {
  return readSnapshot()
}

function getServerSnapshot(): IssueListPreferences {
  return DEFAULT_PREFERENCES
}

function notify() {
  for (const listener of listeners) listener()
}

export function useIssueListPreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function update(partial: Partial<IssueListPreferences>) {
    const next = { ...readSnapshot(), ...partial }
    cachedSnapshot = next
    issueListPreferencesStorage.setItem(STORAGE_KEY, next)
    notify()
  }

  return { preferences, update }
}
