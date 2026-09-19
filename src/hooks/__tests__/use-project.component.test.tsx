import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import {
  useArchiveProject,
  useCreateProject,
  useDeleteProject,
  useFavoriteProject,
  useProject,
  useProjects,
  useRestoreProject,
  useUnfavoriteProject,
  useUpdateProject,
  useUploadProjectCover,
} from '../use-project'

const WORKSPACE_ID = 'ws-1'

// Mirrors the hook's key factories: the list keys and the detail key share
// the `[['projects'], workspaceId]` prefix.
const projectsKey = (workspaceId = WORKSPACE_ID) =>
  [['projects'], workspaceId] as const
const listKey = (archived = false, workspaceId = WORKSPACE_ID) =>
  [...projectsKey(workspaceId), { archived }] as const
const detailKey = (slug: string, workspaceId = WORKSPACE_ID) =>
  [...projectsKey(workspaceId), slug] as const

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Alpha',
    slug: 'alpha',
    identifier: 'ALP',
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: false,
    modulesEnabled: false,
    cyclesEnabled: false,
    estimatesEnabled: false,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: WORKSPACE_ID,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** A fetch response the test settles by hand, to observe in-flight state. */
function deferredResponse() {
  let resolve!: (res: Response) => void
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('useUploadProjectCover', () => {
  it('POSTs the file as multipart form data and returns the url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: 'https://cdn.test/cover.png' }),
    )
    const file = new File(['img'], 'cover.png', { type: 'image/png' })
    const { result } = renderHookWithProviders(() =>
      useUploadProjectCover(WORKSPACE_ID),
    )

    let url: string | undefined
    await act(async () => {
      url = await result.current.mutateAsync(file)
    })

    expect(url).toBe('https://cdn.test/cover.png')
    const { url: requestUrl, method, body } = getFetchCall(fetchSpy)
    expect(requestUrl).toBe('/api/workspaces/ws-1/projects/cover-image')
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
  })

  it('falls back to the hook message when the upload fails silently', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUploadProjectCover(WORKSPACE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'x.png')),
      ).rejects.toThrow('Erro ao enviar capa')
    })
  })
})

describe('useProjects', () => {
  it('fetches the active projects of the workspace', async () => {
    const projects = [buildProject()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(projects))

    const { result } = renderHookWithProviders(() => useProjects(WORKSPACE_ID))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(projects)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/',
      method: 'GET',
    })
  })

  it('asks for archived projects and caches them under their own key', async () => {
    const archived = [buildProject({ archivedAt: '2026-02-01T00:00:00.000Z' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(archived))

    const { result, queryClient } = renderHookWithProviders(() =>
      useProjects(WORKSPACE_ID, true),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getFetchCall(fetchSpy).url).toBe(
      '/api/workspaces/ws-1/projects/?archived=true',
    )
    expect(queryClient.getQueryData(listKey(true))).toEqual(archived)
    expect(queryClient.getQueryData(listKey(false))).toBeUndefined()
  })

  it('does not fetch without a workspace id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useProjects(''))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso'))

    const { result } = renderHookWithProviders(() => useProjects(WORKSPACE_ID))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useProjects(WORKSPACE_ID))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar projetos')
  })
})

describe('useProject', () => {
  it('fetches a single project by slug', async () => {
    const project = buildProject()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(project))

    const { result } = renderHookWithProviders(() =>
      useProject(WORKSPACE_ID, 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(project)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/alpha',
      method: 'GET',
    })
  })

  it.each([
    ['workspace id', '', 'alpha'],
    ['slug', WORKSPACE_ID, ''],
  ])('does not fetch without a %s', (_, workspaceId, slug) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useProject(workspaceId, slug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404))

    const { result } = renderHookWithProviders(() =>
      useProject(WORKSPACE_ID, 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar projeto')
  })
})

describe('useCreateProject', () => {
  it('POSTs the project and invalidates every project list', async () => {
    const input = { name: 'Alpha', slug: 'alpha', isPublic: true }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProject(WORKSPACE_ID),
    )
    queryClient.setQueryData(listKey(false), [])
    queryClient.setQueryData(listKey(true), [])
    queryClient.setQueryData(listKey(false, 'ws-2'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1/projects',
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(listKey(true))?.isInvalidated).toBe(true)
    // Another workspace's projects are left alone.
    expect(
      queryClient.getQueryState(listKey(false, 'ws-2'))?.isInvalidated,
    ).toBe(false)
  })

  it('does not invalidate anything when the create fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Slug em uso'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProject(WORKSPACE_ID),
    )
    queryClient.setQueryData(listKey(false), [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Alpha', slug: 'alpha' }),
      ).rejects.toThrow('Slug em uso')
    })

    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useCreateProject(WORKSPACE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Alpha', slug: 'alpha' }),
      ).rejects.toThrow('Erro ao criar projeto')
    })
  })
})

describe('useUpdateProject', () => {
  it('PATCHes the project and invalidates the lists and the detail', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject({ name: 'Beta' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateProject(WORKSPACE_ID, 'alpha'),
    )
    queryClient.setQueryData(listKey(false), [buildProject()])
    queryClient.setQueryData(detailKey('alpha'), buildProject())

    await act(() =>
      result.current.mutateAsync({ name: 'Beta', cyclesEnabled: true }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1/projects/alpha',
      method: 'PATCH',
      body: { name: 'Beta', cyclesEnabled: true },
    })
    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey('alpha'))?.isInvalidated).toBe(
      true,
    )
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateProject(WORKSPACE_ID, 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Beta' }),
      ).rejects.toThrow('Erro ao atualizar projeto')
    })
  })
})

describe.each([
  [
    'useArchiveProject',
    useArchiveProject,
    'archive',
    'Erro ao arquivar projeto',
  ],
  [
    'useRestoreProject',
    useRestoreProject,
    'restore',
    'Erro ao restaurar projeto',
  ],
] as const)('%s', (_, useHook, action, fallback) => {
  it(`PATCHes /${action} and invalidates the lists and the detail`, async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject()),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook(WORKSPACE_ID, 'alpha'),
    )
    queryClient.setQueryData(listKey(false), [buildProject()])
    queryClient.setQueryData(listKey(true), [])
    queryClient.setQueryData(detailKey('alpha'), buildProject())

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `/api/workspaces/ws-1/projects/alpha/${action}`,
      method: 'PATCH',
    })
    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(listKey(true))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey('alpha'))?.isInvalidated).toBe(
      true,
    )
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useHook(WORKSPACE_ID, 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(fallback)
    })
  })
})

describe('useDeleteProject', () => {
  it('DELETEs the project and invalidates the lists and the detail', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteProject(WORKSPACE_ID, 'alpha'),
    )
    queryClient.setQueryData(listKey(false), [buildProject()])
    queryClient.setQueryData(detailKey('alpha'), buildProject())

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/alpha',
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey('alpha'))?.isInvalidated).toBe(
      true,
    )
  })

  it('surfaces the backend message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteProject(WORKSPACE_ID, 'alpha'),
    )
    queryClient.setQueryData(listKey(false), [buildProject()])

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Sem permissão',
      )
    })

    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useDeleteProject(WORKSPACE_ID, 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao deletar projeto',
      )
    })
  })
})

// Both favorite hooks share the same optimistic flow and differ only in the
// HTTP method, the flag they write and the fallback message.
describe.each([
  {
    name: 'useFavoriteProject',
    useHook: useFavoriteProject,
    method: 'POST',
    from: false,
    to: true,
    fallback: 'Erro ao favoritar projeto',
  },
  {
    name: 'useUnfavoriteProject',
    useHook: useUnfavoriteProject,
    method: 'DELETE',
    from: true,
    to: false,
    fallback: 'Erro ao desafavoritar projeto',
  },
] as const)('$name', ({ useHook, method, from, to, fallback }) => {
  function seedLists(
    queryClient: ReturnType<typeof renderHookWithProviders>['queryClient'],
  ) {
    const alpha = buildProject({ isFavorited: from })
    const beta = buildProject({
      id: 'project-2',
      slug: 'beta',
      isFavorited: from,
    })
    const archivedAlpha = buildProject({
      id: 'project-3',
      slug: 'alpha',
      isFavorited: from,
      archivedAt: '2026-02-01T00:00:00.000Z',
    })
    const otherWorkspace = buildProject({
      id: 'project-4',
      workspaceId: 'ws-2',
      isFavorited: from,
    })
    queryClient.setQueryData(listKey(false), [alpha, beta])
    queryClient.setQueryData(listKey(true), [archivedAlpha])
    queryClient.setQueryData(listKey(false, 'ws-2'), [otherWorkspace])
    return { alpha, beta, archivedAlpha, otherWorkspace }
  }

  it(`${method}s the favorite endpoint of the given slug`, async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ favourited: to }),
    )
    const { result } = renderHookWithProviders(() => useHook(WORKSPACE_ID))

    await act(() => result.current.mutateAsync('alpha'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/alpha/favorite',
      method,
    })
  })

  it('flips the flag optimistically in every list of the workspace before the request settles', async () => {
    const pending = deferredResponse()
    mockFetch().mockReturnValueOnce(pending.promise)
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook(WORKSPACE_ID),
    )
    const { alpha, beta, archivedAlpha, otherWorkspace } =
      seedLists(queryClient)

    act(() => {
      result.current.mutate('alpha')
    })

    await waitFor(() =>
      expect(queryClient.getQueryData(listKey(false))).toEqual([
        { ...alpha, isFavorited: to },
        beta,
      ]),
    )
    expect(queryClient.getQueryData(listKey(true))).toEqual([
      { ...archivedAlpha, isFavorited: to },
    ])
    // Other workspaces are outside the optimistic update.
    expect(queryClient.getQueryData(listKey(false, 'ws-2'))).toEqual([
      otherWorkspace,
    ])

    await act(async () => {
      pending.resolve(apiSuccess({ favourited: to }))
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('keeps the optimistic value and invalidates the lists and the detail on success', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess({ favourited: to }))
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook(WORKSPACE_ID),
    )
    const { alpha, beta } = seedLists(queryClient)

    await act(() => result.current.mutateAsync('alpha'))

    expect(queryClient.getQueryData(listKey(false))).toEqual([
      { ...alpha, isFavorited: to },
      beta,
    ])
    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(listKey(true))?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(listKey(false, 'ws-2'))?.isInvalidated,
    ).toBe(false)
  })

  it('rolls every list back to its snapshot when the request fails', async () => {
    const pending = deferredResponse()
    mockFetch().mockReturnValueOnce(pending.promise)
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook(WORKSPACE_ID),
    )
    const { alpha, beta, archivedAlpha, otherWorkspace } =
      seedLists(queryClient)

    let mutation!: Promise<unknown>
    act(() => {
      mutation = result.current.mutateAsync('alpha').catch((error) => error)
    })
    // The optimistic write happened before we fail the request.
    await waitFor(() =>
      expect(queryClient.getQueryData(listKey(false))).toEqual([
        { ...alpha, isFavorited: to },
        beta,
      ]),
    )

    let error: unknown
    await act(async () => {
      pending.resolve(apiError(403, 'Sem permissão'))
      error = await mutation
    })

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Sem permissão')
    expect(queryClient.getQueryData(listKey(false))).toEqual([alpha, beta])
    expect(queryClient.getQueryData(listKey(true))).toEqual([archivedAlpha])
    expect(queryClient.getQueryData(listKey(false, 'ws-2'))).toEqual([
      otherWorkspace,
    ])
    // Settled either way, so the lists are refetched to reconcile.
    expect(queryClient.getQueryState(listKey(false))?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useHook(WORKSPACE_ID))

    await act(async () => {
      await expect(result.current.mutateAsync('alpha')).rejects.toThrow(
        fallback,
      )
    })
  })

  it('sends the request and leaves the cache empty when no list is loaded', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ favourited: to }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook(WORKSPACE_ID),
    )

    await act(() => result.current.mutateAsync('alpha'))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(listKey(false))).toBeUndefined()
  })
})
