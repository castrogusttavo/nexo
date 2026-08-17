'use client'

import { useSyncExternalStore } from "react"
import { issueListPreferencesStorage } from "./issue-list-preferences-storage"

export type IssueGroupBy =
  | 'state'
  | 'priority'
  | 'cycle'
  | 'module'
  | 'labels'
  | 'assignees'
  | 'created-by'
  | 'none'

export type IssueSortBy =
  | 'manual'
  | 'created-at'
  | 'updated-at'
  | 'start-date'
  | 'due-date'
  | 'priority'

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

function readSnapshot(): IssueListPreferences {
  if (cachedSnapshot === null) {
    cachedSnapshot = issueListPreferencesStorage.getOrInit(STORAGE_KEY, () => DEFAULT_PREFERENCES)
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
