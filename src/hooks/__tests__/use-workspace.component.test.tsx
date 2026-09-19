import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import { useCreateWorkspace } from '../use-workspace'

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
