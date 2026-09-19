import { act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserPreferenceDTO } from '@/types/user-preference'
import {
  applyTheme,
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
