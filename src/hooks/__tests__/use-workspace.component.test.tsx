import { act, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import { useUser } from '../use-user'
import { useCreateWorkspace } from '../use-workspace'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const WORKSPACE_KEY = ['workspace']

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}): WorkspaceDTO {
  return {
    id: 'ws-1',
    name: 'Acme',
    slug: 'acme',
    activePlan: 'FREE',
    trialEndsAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useCreateWorkspace', () => {
  it('POSTs the name and slug and returns the created workspace', async () => {
    const workspace = buildWorkspace()
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(workspace, 201),
    )
    const { result } = renderHookWithProviders(() => useCreateWorkspace())

    let created: WorkspaceDTO | undefined
    await act(async () => {
      created = await result.current.mutateAsync({
        name: 'Acme',
        slug: 'acme',
      })
    })

    expect(created).toEqual(workspace)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces',
      method: 'POST',
      body: { name: 'Acme', slug: 'acme' },
    })
  })

  it('invalidates the workspace queries on success', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildWorkspace(), 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateWorkspace(),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])

    await act(() => result.current.mutateAsync({ name: 'Acme', slug: 'acme' }))

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(true)
  })

  // The user DTO carries the memberships, so creating a workspace must
  // refetch the signed-in user's profile for the new one to show up.
  it("refetches the signed-in user's profile on success", async () => {
    useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ id: 'user-1', memberships: [] }),
    )
    const { result } = renderHookWithProviders(() => ({
      user: useUser(),
      create: useCreateWorkspace(),
    }))
    await waitFor(() => expect(result.current.user.isSuccess).toBe(true))
    const membership = { workspaceId: 'ws-1', slug: 'acme', name: 'Acme' }
    fetchSpy
      .mockResolvedValueOnce(apiSuccess(buildWorkspace(), 201))
      .mockResolvedValueOnce(
        apiSuccess({ id: 'user-1', memberships: [membership] }),
      )

    await act(() =>
      result.current.create.mutateAsync({ name: 'Acme', slug: 'acme' }),
    )

    await waitFor(() =>
      expect(result.current.user.data?.memberships).toEqual([membership]),
    )
  })

  it('leaves the cache untouched when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Slug já em uso'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateWorkspace(),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Acme', slug: 'acme' }),
      ).rejects.toThrow('Slug já em uso')
    })

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useCreateWorkspace())

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Acme', slug: 'acme' }),
      ).rejects.toThrow('Erro ao criar workspace')
    })
  })
})
