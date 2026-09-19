import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'preferences'

const DEFAULTS = {
  groupBy: 'state',
  sortBy: 'manual',
  showSubIssues: true,
  showEmptyGroups: true,
}

// The hook keeps a module-level snapshot cache, so each test loads fresh
// copies of the hook and its storage to start from what is in localStorage.
async function loadModules() {
  const { useIssueListPreferences } = await import(
    '../use-issue-list-preferences'
  )
  const { issueListPreferencesStorage } = await import(
    '../issue-list-preferences-storage'
  )
  return { useIssueListPreferences, storage: issueListPreferencesStorage }
}

// Minimal in-memory Web Storage. Under Node >= 25 the runtime's own
// (disabled) `localStorage` global shadows jsdom's, leaving it undefined
// in this environment, so the test provides one.
function createMemoryLocalStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, String(value))
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryLocalStorage())
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIssueListPreferences', () => {
  it('starts from the defaults and persists them on first read', async () => {
    const { useIssueListPreferences, storage } = await loadModules()

    const { result } = renderHook(() => useIssueListPreferences())

    expect(result.current.preferences).toEqual(DEFAULTS)
    expect(storage.getItem(STORAGE_KEY)).toEqual(DEFAULTS)
    expect(
      localStorage.getItem('nexo-issue-list-preferences:preferences'),
    ).not.toBeNull()
  })

  it('reads previously stored preferences', async () => {
    const { useIssueListPreferences, storage } = await loadModules()
    const stored = {
      groupBy: 'priority',
      sortBy: 'due-date',
      showSubIssues: false,
      showEmptyGroups: false,
    }
    storage.setItem(STORAGE_KEY, stored)

    const { result } = renderHook(() => useIssueListPreferences())

    expect(result.current.preferences).toEqual(stored)
  })

  it('merges a partial update and persists it', async () => {
    const { useIssueListPreferences, storage } = await loadModules()
    const { result } = renderHook(() => useIssueListPreferences())

    act(() => result.current.update({ groupBy: 'labels' }))
    act(() => result.current.update({ showEmptyGroups: false }))

    const expected = {
      ...DEFAULTS,
      groupBy: 'labels',
      showEmptyGroups: false,
    }
    expect(result.current.preferences).toEqual(expected)
    expect(storage.getItem(STORAGE_KEY)).toEqual(expected)
  })

  it('shares updates across every mounted consumer', async () => {
    const { useIssueListPreferences } = await loadModules()
    const first = renderHook(() => useIssueListPreferences())
    const second = renderHook(() => useIssueListPreferences())

    act(() => first.result.current.update({ sortBy: 'priority' }))

    expect(second.result.current.preferences.sortBy).toBe('priority')
  })

  it('keeps the update after a remount', async () => {
    const { useIssueListPreferences } = await loadModules()
    const { result, unmount } = renderHook(() => useIssueListPreferences())
    act(() => result.current.update({ showSubIssues: false }))
    unmount()

    const remounted = renderHook(() => useIssueListPreferences())

    expect(remounted.result.current.preferences.showSubIssues).toBe(false)
  })

  it('stops notifying a consumer once it unmounts', async () => {
    const { useIssueListPreferences } = await loadModules()
    let renders = 0
    const { unmount } = renderHook(() => {
      renders++
      return useIssueListPreferences()
    })
    const other = renderHook(() => useIssueListPreferences())
    unmount()
    const rendersAtUnmount = renders

    act(() => other.result.current.update({ groupBy: 'cycle' }))

    expect(renders).toBe(rendersAtUnmount)
  })

  it('renders the defaults on the server', async () => {
    const { useIssueListPreferences, storage } = await loadModules()
    storage.setItem(STORAGE_KEY, { ...DEFAULTS, groupBy: 'module' })
    function Probe() {
      return <span>{useIssueListPreferences().preferences.groupBy}</span>
    }

    expect(renderToString(<Probe />)).toContain('state')
  })
})
