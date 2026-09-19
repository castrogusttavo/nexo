import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WikiPageDTO } from '@/types/wiki-page'
import {
  useArchiveWikiPage,
  useCreateWikiPage,
  useUpdateWikiPage,
  useWikiPages,
} from '../use-wiki-page'

const BASE_URL = '/api/workspaces/ws-1/wiki'
const PAGES_KEY = ['wiki-pages', 'ws-1']
const OTHER_WORKSPACE_KEY = ['wiki-pages', 'ws-2']

function buildWikiPage(overrides: Partial<WikiPageDTO> = {}): WikiPageDTO {
  return {
    id: 'page-1',
    workspaceId: 'ws-1',
    parentId: null,
    title: 'Onboarding',
    icon: null,
    coverImage: null,
    content: [{ type: 'p', children: [{ text: '' }] }],
    position: 0,
    createdById: 'user-1',
    updatedById: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useWikiPages', () => {
  it('fetches the wiki pages of the workspace', async () => {
    const pages = [buildWikiPage()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(pages))

    const { result } = renderHookWithProviders(() => useWikiPages('ws-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(pages)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it('does not fetch without a workspace id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useWikiPages(''))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso'))

    const { result } = renderHookWithProviders(() => useWikiPages('ws-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useWikiPages('ws-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar páginas de wiki')
  })
})

describe('useCreateWikiPage', () => {
  it('POSTs the page data and invalidates only this workspace list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWikiPage({ id: 'page-2' }), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateWikiPage('ws-1'),
    )
    queryClient.setQueryData(PAGES_KEY, [])
    queryClient.setQueryData(OTHER_WORKSPACE_KEY, [])

    await act(() =>
      result.current.mutateAsync({
        title: 'Guia',
        parentId: 'page-1',
        icon: '📘',
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: { title: 'Guia', parentId: 'page-1', icon: '📘' },
    })
    expect(queryClient.getQueryState(PAGES_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_WORKSPACE_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('rejects with the fallback message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateWikiPage('ws-1'),
    )
    queryClient.setQueryData(PAGES_KEY, [])

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow(
        'Erro ao criar página',
      )
    })

    expect(queryClient.getQueryState(PAGES_KEY)?.isInvalidated).toBe(false)
  })
})

describe('useUpdateWikiPage', () => {
  it('PATCHes the page and swaps it in the cached list', async () => {
    const page = buildWikiPage()
    const sibling = buildWikiPage({ id: 'page-2', title: 'Outro' })
    const updated = { ...page, title: 'Novo título', coverImage: null }
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(updated))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWikiPage('ws-1', 'page-1'),
    )
    queryClient.setQueryData(PAGES_KEY, [page, sibling])

    await act(() =>
      result.current.mutateAsync({ title: 'Novo título', coverImage: null }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/page-1`,
      method: 'PATCH',
      body: { title: 'Novo título', coverImage: null },
    })
    expect(queryClient.getQueryData(PAGES_KEY)).toEqual([updated, sibling])
  })

  it('leaves the cache empty when the list was never loaded', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildWikiPage()))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWikiPage('ws-1', 'page-1'),
    )

    await act(() => result.current.mutateAsync({ title: 'X' }))

    expect(queryClient.getQueryData(PAGES_KEY)).toBeUndefined()
  })

  it('keeps the cache untouched when the save fails', async () => {
    const pages = [buildWikiPage()]
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWikiPage('ws-1', 'page-1'),
    )
    queryClient.setQueryData(PAGES_KEY, pages)

    await act(async () => {
      await expect(result.current.mutateAsync({ title: 'X' })).rejects.toThrow(
        'Erro ao salvar página',
      )
    })

    expect(queryClient.getQueryData(PAGES_KEY)).toEqual(pages)
  })
})

describe('useArchiveWikiPage', () => {
  it('PATCHes the archive route and drops the page from the cache', async () => {
    const archived = buildWikiPage({ id: 'page-1' })
    const kept = buildWikiPage({ id: 'page-2' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ ...archived, archivedAt: '2026-01-02T00:00:00.000Z' }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useArchiveWikiPage('ws-1', 'page-1'),
    )
    queryClient.setQueryData(PAGES_KEY, [archived, kept])

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/page-1/archive`,
      method: 'PATCH',
      body: {},
    })
    expect(queryClient.getQueryData(PAGES_KEY)).toEqual([kept])
  })

  it('drops the sub-pages the server archived with it', async () => {
    const root = buildWikiPage({ id: 'page-1' })
    const child = buildWikiPage({ id: 'page-2', parentId: 'page-1' })
    const grandchild = buildWikiPage({ id: 'page-3', parentId: 'page-2' })
    const sibling = buildWikiPage({ id: 'page-4' })
    mockFetch().mockResolvedValueOnce(apiSuccess(root))
    const { result, queryClient } = renderHookWithProviders(() =>
      useArchiveWikiPage('ws-1', 'page-1'),
    )
    queryClient.setQueryData(PAGES_KEY, [root, child, grandchild, sibling])

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryData(PAGES_KEY)).toEqual([sibling])
  })

  it('leaves the cache empty when the list was never loaded', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildWikiPage()))
    const { result, queryClient } = renderHookWithProviders(() =>
      useArchiveWikiPage('ws-1', 'page-1'),
    )

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryData(PAGES_KEY)).toBeUndefined()
  })

  it('keeps the page in the cache when the archive fails', async () => {
    const pages = [buildWikiPage()]
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useArchiveWikiPage('ws-1', 'page-1'),
    )
    queryClient.setQueryData(PAGES_KEY, pages)

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Sem permissão',
      )
    })

    expect(queryClient.getQueryData(PAGES_KEY)).toEqual(pages)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useArchiveWikiPage('ws-1', 'page-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao arquivar página',
      )
    })
  })
})
