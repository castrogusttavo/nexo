import { act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  createTestQueryClient,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_SIDEBAR_NAVIGATION,
} from '@/src/schemas/user-preference.schema'
import type { UserPreferenceDTO } from '@/types/user-preference'
import {
  applyTheme,
  useSidebarNavigation,
  useUpdateUserPreferences,
  useUserPreferences,
} from '../use-user-preferences'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const PREFERENCE_KEY = ['user-preferences']

function buildPreferences(
  overrides: Partial<UserPreferenceDTO> = {},
): UserPreferenceDTO {
  return {
    theme: 'LIGHT',
    smoothCursor: true,
    quickSendShortcut: 'ENTER',
    timezone: 'America/Sao_Paulo',
    weekStartsOn: 0,
    weekendDays: [0, 6],
    navigation: DEFAULT_SIDEBAR_NAVIGATION,
    homeWidgets: DEFAULT_HOME_WIDGETS,
    ...overrides,
  }
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('useUserPreferences', () => {
  it('fetches the preferences once there is a session', async () => {
    const prefs = buildPreferences()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(prefs))

    const { result } = renderHookWithProviders(() => useUserPreferences())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(prefs)
    expect(getFetchCall(fetchSpy).url).toBe('/api/users/me/preferences')
  })

  it('does not fetch while signed out', () => {
    useSession.mockReturnValue({ data: null })
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useUserPreferences())

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('useUpdateUserPreferences', () => {
  it('applies the change optimistically before the server answers', async () => {
    const response = deferredResponse()
    mockFetch().mockReturnValueOnce(response.promise)
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateUserPreferences(),
    )
    queryClient.setQueryData(PREFERENCE_KEY, buildPreferences())

    act(() => {
      result.current.mutate({ theme: 'DARK' })
    })

    await waitFor(() =>
      expect(
        queryClient.getQueryData<UserPreferenceDTO>(PREFERENCE_KEY)?.theme,
      ).toBe('DARK'),
    )
    expect(isDark()).toBe(true)

    const saved = buildPreferences({ theme: 'DARK' })
    response.resolve(apiSuccess(saved))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(PREFERENCE_KEY)).toEqual(saved)
  })

  it('sends only the changed fields', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildPreferences({ smoothCursor: false })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateUserPreferences(),
    )
    queryClient.setQueryData(PREFERENCE_KEY, buildPreferences())

    await act(() => result.current.mutateAsync({ smoothCursor: false }))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me/preferences',
      method: 'PATCH',
      body: { smoothCursor: false },
    })
  })

  it('rolls the cache and the theme back when the save fails', async () => {
    const previous = buildPreferences({ theme: 'LIGHT' })
    mockFetch().mockResolvedValueOnce(apiError(500, 'Erro no servidor'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateUserPreferences(),
    )
    queryClient.setQueryData(PREFERENCE_KEY, previous)

    await act(async () => {
      await expect(
        result.current.mutateAsync({ theme: 'DARK' }),
      ).rejects.toThrow('Erro no servidor')
    })

    expect(queryClient.getQueryData(PREFERENCE_KEY)).toEqual(previous)
    expect(isDark()).toBe(false)
  })

  it('skips the optimistic write when nothing is cached yet', async () => {
    const saved = buildPreferences({ theme: 'DARK' })
    mockFetch().mockResolvedValueOnce(apiSuccess(saved))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateUserPreferences(),
    )

    await act(() => result.current.mutateAsync({ theme: 'DARK' }))

    expect(queryClient.getQueryData(PREFERENCE_KEY)).toEqual(saved)
    // No cached preferences → onMutate never touches the theme.
    expect(isDark()).toBe(false)
  })

  it('leaves the empty cache and the theme alone when a cold save fails', async () => {
    document.documentElement.classList.add('dark')
    mockFetch().mockResolvedValueOnce(apiError(500, 'Erro no servidor'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateUserPreferences(),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ theme: 'LIGHT' }),
      ).rejects.toThrow('Erro no servidor')
    })

    // Nothing to roll back to: no cache entry is invented, the theme stays.
    expect(queryClient.getQueryData(PREFERENCE_KEY)).toBeUndefined()
    expect(isDark()).toBe(true)
  })
})

describe('applyTheme', () => {
  it('toggles the dark class for explicit themes', () => {
    applyTheme('DARK')
    expect(isDark()).toBe(true)

    applyTheme('LIGHT')
    expect(isDark()).toBe(false)
  })

  it('follows the OS preference for SYSTEM', () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
    } as MediaQueryList)

    applyTheme('SYSTEM')

    expect(isDark()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-color-scheme:dark)',
    )
  })
})

describe('useSidebarNavigation', () => {
  const customised = {
    ...DEFAULT_SIDEBAR_NAVIGATION,
    personal: [
      { id: 'stickies' as const, visible: false },
      { id: 'drafts' as const, visible: true },
      { id: 'your-work' as const, visible: true },
    ],
    projectsLimit: 5,
  }

  it('returns the default while signed out and nothing seeds it', () => {
    useSession.mockReturnValue({ data: null })
    mockFetch()

    const { result } = renderHookWithProviders(() => useSidebarNavigation())

    expect(result.current).toEqual(DEFAULT_SIDEBAR_NAVIGATION)
  })

  it('returns the server-read navigation until the query answers', () => {
    const response = deferredResponse()
    mockFetch().mockReturnValueOnce(response.promise)

    const { result } = renderHookWithProviders(() =>
      useSidebarNavigation(customised),
    )

    expect(result.current).toEqual(customised)
  })

  it('follows the fetched preferences once they load', async () => {
    mockFetch().mockResolvedValueOnce(
      apiSuccess(buildPreferences({ navigation: customised })),
    )

    const { result } = renderHookWithProviders(() => useSidebarNavigation())

    await waitFor(() => expect(result.current).toEqual(customised))
  })

  it('reflects an optimistic navigation update at once', async () => {
    const response = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(response.promise)
    // Seeded before mount, so the query is fresh and the only request is
    // the PATCH.
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(PREFERENCE_KEY, buildPreferences())
    const { result } = renderHookWithProviders(
      () => ({
        navigation: useSidebarNavigation(),
        update: useUpdateUserPreferences(),
      }),
      { queryClient },
    )

    act(() => {
      result.current.update.mutate({ navigation: customised })
    })

    await waitFor(() => expect(result.current.navigation).toEqual(customised))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      method: 'PATCH',
      body: { navigation: customised },
    })
    response.resolve(apiSuccess(buildPreferences({ navigation: customised })))
  })
})
