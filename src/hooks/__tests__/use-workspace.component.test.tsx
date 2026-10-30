import { act, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildWorkspaceDTO } from '@/src/__tests__/factories/dto/workspace.dto'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import { useUser } from '../use-user'
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useRemoveWorkspaceLogo,
  useUpdateWorkspace,
  useUploadWorkspaceLogo,
  useWorkspace,
} from '../use-workspace'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const WORKSPACE_KEY = ['workspace']

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}): WorkspaceDTO {
  return buildWorkspaceDTO(overrides)
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

describe('useUpdateWorkspace', () => {
  const USER_KEY = ['user', 'user-1']

  it('PATCHes the switches to the workspace url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace({ projectStatesEnabled: false })),
    )
    const { result } = renderHookWithProviders(() => useUpdateWorkspace('ws-1'))

    let updated: WorkspaceDTO | undefined
    await act(async () => {
      updated = await result.current.mutateAsync({
        projectStatesEnabled: false,
      })
    })

    expect(updated?.projectStatesEnabled).toBe(false)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1',
      method: 'PATCH',
      body: { projectStatesEnabled: false },
    })
  })

  it('invalidates the workspace and the user queries on success', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildWorkspace()))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWorkspace('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])
    queryClient.setQueryData(USER_KEY, { id: 'user-1', memberships: [] })

    await act(() => result.current.mutateAsync({ projectLabelsEnabled: true }))

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(USER_KEY)?.isInvalidated).toBe(true)
  })

  it('leaves the cache untouched when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(403, 'Apenas OWNER ou ADMIN podem editar o workspace'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWorkspace('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])
    queryClient.setQueryData(USER_KEY, { id: 'user-1', memberships: [] })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ projectStatesEnabled: false }),
      ).rejects.toThrow('Apenas OWNER ou ADMIN podem editar o workspace')
    })

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(USER_KEY)?.isInvalidated).toBe(false)
  })

  it('fails back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useUpdateWorkspace('ws-1'))

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Acme' }),
      ).rejects.toThrow('Erro ao atualizar workspace')
    })
  })
})

describe('useUploadWorkspaceLogo', () => {
  it('POSTs the file as form data and resolves with the uploaded url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: 'https://cdn.example.com/logo.png' }, 201),
    )
    const { result } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )
    const file = new File(['png'], 'logo.png', { type: 'image/png' })

    let returned: string | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(file)
    })

    expect(returned).toBe('https://cdn.example.com/logo.png')
    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe('/api/workspaces/ws-1/logo')
    expect(call.method).toBe('POST')
    expect(call.body).toBeInstanceOf(FormData)
    expect((call.body as FormData).get('logo')).toBe(file)
  })

  it('invalidates the workspace and the user queries on success', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess({ url: 'https://x/l.png' }))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])
    queryClient.setQueryData(['user', 'user-1'], { id: 'user-1' })

    await act(() => result.current.mutateAsync(new File(['x'], 'l.png')))

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['user', 'user-1'])?.isInvalidated).toBe(
      true,
    )
  })

  it('surfaces the backend message and leaves the cache alone on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(422, 'Arquivo muito grande'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'l.png')),
      ).rejects.toThrow('Arquivo muito grande')
    })

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'l.png')),
      ).rejects.toThrow('Erro ao enviar logo')
    })
  })
})

describe('useRemoveWorkspaceLogo', () => {
  it('DELETEs the logo url without a body', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result } = renderHookWithProviders(() =>
      useRemoveWorkspaceLogo('ws-1'),
    )

    await act(() => result.current.mutateAsync())

    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe('/api/workspaces/ws-1/logo')
    expect(call.method).toBe('DELETE')
  })

  it('invalidates the workspace and the user queries on success', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveWorkspaceLogo('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])
    queryClient.setQueryData(['user', 'user-1'], { id: 'user-1' })

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['user', 'user-1'])?.isInvalidated).toBe(
      true,
    )
  })

  it('falls back to the hook message on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useRemoveWorkspaceLogo('ws-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao remover logo',
      )
    })
  })
})

describe('useDeleteWorkspace', () => {
  it('DELETEs the workspace url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result } = renderHookWithProviders(() => useDeleteWorkspace('ws-1'))

    await act(() => result.current.mutateAsync())

    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe('/api/workspaces/ws-1')
    expect(call.method).toBe('DELETE')
  })

  it('invalidates the workspace and the user queries on success', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteWorkspace('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])
    queryClient.setQueryData(['user', 'user-1'], { id: 'user-1' })

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['user', 'user-1'])?.isInvalidated).toBe(
      true,
    )
  })

  it('leaves the cache untouched and surfaces the message when it fails', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(403, 'Apenas o OWNER pode deletar o workspace'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteWorkspace('ws-1'),
    )
    queryClient.setQueryData(WORKSPACE_KEY, [])

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Apenas o OWNER pode deletar o workspace',
      )
    })

    expect(queryClient.getQueryState(WORKSPACE_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useDeleteWorkspace('ws-1'))

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao excluir workspace',
      )
    })
  })
})

describe('useWorkspace', () => {
  const KEY = ['workspace', 'ws-1']

  it('serves the server-rendered workspace without a request', () => {
    const fetchSpy = mockFetch()
    const initial = buildWorkspace({ name: 'Acme' })

    const { result } = renderHookWithProviders(() =>
      useWorkspace('ws-1', initial),
    )

    expect(result.current.data).toEqual(initial)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refetches the workspace once a mutation invalidates it', async () => {
    const initial = buildWorkspace({ name: 'Acme' })
    const fresh = buildWorkspace({ name: 'Acme Inc' })
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(fresh))
    const { result, queryClient } = renderHookWithProviders(() => ({
      workspace: useWorkspace('ws-1', initial),
      update: useUpdateWorkspace('ws-1'),
    }))

    await act(() => result.current.update.mutateAsync({ name: 'Acme Inc' }))

    await waitFor(() => expect(result.current.workspace.data).toEqual(fresh))
    expect(getFetchCall(fetchSpy, 0).url).toBe('/api/workspaces/ws-1')
    expect(queryClient.getQueryData(KEY)).toEqual(fresh)
  })
})

describe('workspace cache writes', () => {
  const KEY = ['workspace', 'ws-1']

  it('writes the PATCH response into the workspace query', async () => {
    const updated = buildWorkspace({ name: 'Renamed' })
    mockFetch().mockResolvedValueOnce(apiSuccess(updated))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWorkspace('ws-1'),
    )
    queryClient.setQueryData(KEY, buildWorkspace({ name: 'Old' }))

    await act(() => result.current.mutateAsync({ name: 'Renamed' }))

    expect(queryClient.getQueryData<WorkspaceDTO>(KEY)?.name).toBe('Renamed')
  })

  it('patches the cached logo as soon as an upload succeeds', async () => {
    mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: 'https://cdn.example.com/new.png' }, 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )
    queryClient.setQueryData(KEY, buildWorkspace({ image: null }))

    await act(() => result.current.mutateAsync(new File(['x'], 'l.png')))

    expect(queryClient.getQueryData<WorkspaceDTO>(KEY)?.image).toBe(
      'https://cdn.example.com/new.png',
    )
  })

  it('clears the cached logo as soon as a removal succeeds', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveWorkspaceLogo('ws-1'),
    )
    queryClient.setQueryData(
      KEY,
      buildWorkspace({ image: 'https://cdn.example.com/old.png' }),
    )

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryData<WorkspaceDTO>(KEY)?.image).toBeNull()
  })

  it('does not invent a workspace when none is cached', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess({ url: 'https://x/l.png' }))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )

    await act(() => result.current.mutateAsync(new File(['x'], 'l.png')))

    expect(queryClient.getQueryData(KEY)).toBeUndefined()
  })

  it('keeps the cached logo when the upload fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(422, 'Arquivo muito grande'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadWorkspaceLogo('ws-1'),
    )
    queryClient.setQueryData(
      KEY,
      buildWorkspace({ image: 'https://cdn.example.com/old.png' }),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'l.png')),
      ).rejects.toThrow()
    })

    expect(queryClient.getQueryData<WorkspaceDTO>(KEY)?.image).toBe(
      'https://cdn.example.com/old.png',
    )
  })
})
