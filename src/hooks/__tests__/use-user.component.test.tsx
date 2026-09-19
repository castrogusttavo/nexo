import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserDTO } from '@/types/user'
import {
  useDeleteAccount,
  useUpdateUser,
  useUploadAvatar,
  useUploadCover,
  useUser,
} from '../use-user'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

function buildUser(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
    username: 'ana',
    emailVerified: true,
    image: null,
    coverImage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletionScheduledAt: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    onboardingStep: null,
    role: 'DEVELOPER',
    goals: ['SPRINTS'],
    memberships: [
      { workspaceId: 'ws-1', slug: 'acme', name: 'Acme', role: 'OWNER' },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

describe('useUser', () => {
  it('fetches the signed-in user', async () => {
    const user = buildUser()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(user))

    const { result, queryClient } = renderHookWithProviders(() => useUser())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(user)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/users/me',
      method: 'GET',
    })
    // Scoped by session user so switching accounts never reuses the cache.
    expect(queryClient.getQueryData([['user'], 'user-1'])).toEqual(user)
  })

  it('does not fetch while signed out', () => {
    useSession.mockReturnValue({ data: null })
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useUser())

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(401, 'Sessão expirada'))

    const { result } = renderHookWithProviders(() => useUser())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sessão expirada')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useUser())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar usuário')
  })
})

// NOTE: the mutations below invalidate `['user']`, which does not prefix-match
// `useUser`'s `[['user'], id]` key, so the profile query is never refreshed.
// That is a source bug (reported), so the invalidation is not asserted here.

describe('useUpdateUser', () => {
  it('PATCHes the profile fields and returns the updated user', async () => {
    const updated = buildUser({ name: 'Ana Souza', username: 'anasouza' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(updated))
    const { result } = renderHookWithProviders(() => useUpdateUser())

    let returned: UserDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({
        name: 'Ana Souza',
        username: 'anasouza',
      })
    })

    expect(returned).toEqual(updated)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me',
      method: 'PATCH',
      body: { name: 'Ana Souza', username: 'anasouza' },
    })
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Username já em uso'))
    const { result } = renderHookWithProviders(() => useUpdateUser())

    await act(async () => {
      await expect(
        result.current.mutateAsync({ username: 'taken' }),
      ).rejects.toThrow('Username já em uso')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useUpdateUser())

    await act(async () => {
      await expect(result.current.mutateAsync({ name: 'Ana' })).rejects.toThrow(
        'Erro ao atualizar perfil',
      )
    })
  })
})

describe.each([
  {
    name: 'useUploadAvatar',
    useHook: useUploadAvatar,
    url: '/api/users/me/avatar',
    field: 'avatars',
    fallback: 'Erro ao enviar avatar',
  },
  {
    name: 'useUploadCover',
    useHook: useUploadCover,
    url: '/api/users/me/cover',
    field: 'cover',
    fallback: 'Erro ao enviar capa',
  },
])('$name', ({ useHook, url, field, fallback }) => {
  it('POSTs the file as form data and resolves with the uploaded url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: 'https://cdn.example.com/img.png' }),
    )
    const { result } = renderHookWithProviders(() => useHook())
    const file = new File(['png'], 'img.png', { type: 'image/png' })

    let returned: string | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(file)
    })

    expect(returned).toBe('https://cdn.example.com/img.png')
    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe(url)
    expect(call.method).toBe('POST')
    expect(call.body).toBeInstanceOf(FormData)
    expect((call.body as FormData).get(field)).toBe(file)
  })

  it('surfaces the backend message when the upload is rejected', async () => {
    mockFetch().mockResolvedValueOnce(apiError(413, 'Arquivo muito grande'))
    const { result } = renderHookWithProviders(() => useHook())

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'img.png')),
      ).rejects.toThrow('Arquivo muito grande')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useHook())

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'img.png')),
      ).rejects.toThrow(fallback)
    })
  })
})

describe('useDeleteAccount', () => {
  it('DELETEs the account and returns the scheduled deletion date', async () => {
    const scheduled = { scheduleAt: '2026-02-01T00:00:00.000Z' }
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(scheduled))
    const { result } = renderHookWithProviders(() => useDeleteAccount())

    let returned: typeof scheduled | undefined
    await act(async () => {
      returned = await result.current.mutateAsync()
    })

    expect(returned).toEqual(scheduled)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/users/me',
      method: 'DELETE',
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useDeleteAccount())

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao desativar conta',
      )
    })
  })
})
