import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { NotificationSettingDTO } from '@/types/notification-setting'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '../user-notification-settings'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const NOTIFICATION_KEY = ['notification-settings']

function buildSettings(
  overrides: Partial<NotificationSettingDTO> = {},
): NotificationSettingDTO {
  return {
    priorityChanges: true,
    stateChanges: true,
    comments: true,
    mentions: true,
    ...overrides,
  }
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

describe('useNotificationSettings', () => {
  it('fetches the settings once there is a session', async () => {
    const settings = buildSettings({ comments: false })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(settings))

    const { result } = renderHookWithProviders(() => useNotificationSettings())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(settings)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/users/me/notifications',
      method: 'GET',
    })
  })

  it('does not fetch while signed out', () => {
    useSession.mockReturnValue({ data: null })
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useNotificationSettings())

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Falha no servidor'))

    const { result } = renderHookWithProviders(() => useNotificationSettings())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Falha no servidor')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useNotificationSettings())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar notificações')
  })
})

describe('useUpdateNotificationSettings', () => {
  it('PATCHes only the changed fields', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildSettings({ mentions: false })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )
    queryClient.setQueryData(NOTIFICATION_KEY, buildSettings())

    await act(() => result.current.mutateAsync({ mentions: false }))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me/notifications',
      method: 'PATCH',
      body: { mentions: false },
    })
  })

  it('merges the change into the cache before the server answers', async () => {
    let resolveFetch: (res: Response) => void = () => {}
    mockFetch().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )
    queryClient.setQueryData(NOTIFICATION_KEY, buildSettings())

    act(() => {
      result.current.mutate({ comments: false, stateChanges: false })
    })

    // Untouched fields are kept; only the sent ones flip.
    await waitFor(() =>
      expect(queryClient.getQueryData(NOTIFICATION_KEY)).toEqual(
        buildSettings({ comments: false, stateChanges: false }),
      ),
    )
    expect(result.current.isPending).toBe(true)

    resolveFetch(
      apiSuccess(buildSettings({ comments: false, stateChanges: false })),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('replaces the cache with the server response on success', async () => {
    // The server is the source of truth: its answer wins over the
    // optimistic merge, even when it differs from what was sent.
    const saved = buildSettings({ mentions: false, priorityChanges: false })
    mockFetch().mockResolvedValueOnce(apiSuccess(saved))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )
    queryClient.setQueryData(NOTIFICATION_KEY, buildSettings())

    await act(() => result.current.mutateAsync({ mentions: false }))

    expect(queryClient.getQueryData(NOTIFICATION_KEY)).toEqual(saved)
  })

  it('rolls the cache back to the previous settings when the save fails', async () => {
    const previous = buildSettings({ comments: false })
    let resolveFetch: (res: Response) => void = () => {}
    mockFetch().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )
    queryClient.setQueryData(NOTIFICATION_KEY, previous)

    act(() => {
      result.current.mutate({ comments: true, mentions: false })
    })

    // Optimistic value applied first...
    await waitFor(() =>
      expect(queryClient.getQueryData(NOTIFICATION_KEY)).toEqual(
        buildSettings({ comments: true, mentions: false }),
      ),
    )

    // ...then reverted once the server rejects it.
    resolveFetch(apiError(500, 'Erro no servidor'))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro no servidor')
    expect(queryClient.getQueryData(NOTIFICATION_KEY)).toEqual(previous)
  })

  it('falls back to the hook message when the save error has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )
    queryClient.setQueryData(NOTIFICATION_KEY, buildSettings())

    await act(async () => {
      await expect(
        result.current.mutateAsync({ comments: false }),
      ).rejects.toThrow('Erro ao salvar notificações')
    })
  })

  it('skips the optimistic write when nothing is cached yet', async () => {
    let resolveFetch: (res: Response) => void = () => {}
    mockFetch().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )

    act(() => {
      result.current.mutate({ mentions: false })
    })

    // A partial payload must never be cached as if it were full settings.
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(queryClient.getQueryData(NOTIFICATION_KEY)).toBeUndefined()

    const saved = buildSettings({ mentions: false })
    resolveFetch(apiSuccess(saved))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(NOTIFICATION_KEY)).toEqual(saved)
  })

  it('leaves the cache empty when the save fails with nothing cached', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Erro no servidor'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateNotificationSettings(),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ mentions: false }),
      ).rejects.toThrow('Erro no servidor')
    })

    expect(queryClient.getQueryData(NOTIFICATION_KEY)).toBeUndefined()
  })

  it('cancels an in-flight settings fetch so it cannot overwrite the save', async () => {
    let resolveQuery: (res: Response) => void = () => {}
    const saved = buildSettings({ comments: false })
    const fetchSpy = mockFetch()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveQuery = resolve
        }),
      )
      .mockResolvedValueOnce(apiSuccess(saved))

    const { result, queryClient } = renderHookWithProviders(() => ({
      query: useNotificationSettings(),
      mutation: useUpdateNotificationSettings(),
    }))
    // The initial settings fetch is still pending when the user saves.
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    await act(() => result.current.mutation.mutateAsync({ comments: false }))

    // The stale response lands after the save; it must be discarded.
    await act(async () => {
      resolveQuery(apiSuccess(buildSettings()))
    })
    expect(queryClient.getQueryData(NOTIFICATION_KEY)).toEqual(saved)
    expect(getFetchCall(fetchSpy, 1).method).toBe('PATCH')
  })
})
