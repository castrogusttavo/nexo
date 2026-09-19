import { act, waitFor } from '@testing-library/react'
import type { Value } from 'platejs'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WikiCommentDTO } from '@/types/wiki-comment'
import {
  useCreateWikiComment,
  useDeleteWikiComment,
  useResolveWikiComment,
  useUpdateWikiComment,
  useWikiComments,
  wikiCommentsKey,
} from '../use-wiki-comment'

const BASE_URL = '/api/workspaces/ws-1/wiki/page-1/comments'
const COMMENTS_KEY = ['wiki-comments', 'ws-1', 'page-1']
const OTHER_PAGE_KEY = ['wiki-comments', 'ws-1', 'page-2']

const CONTENT: Value = [{ type: 'p', children: [{ text: 'Revisar isto' }] }]

function buildWikiComment(
  overrides: Partial<WikiCommentDTO> = {},
): WikiCommentDTO {
  return {
    id: 'comment-1',
    wikiPageId: 'page-1',
    markId: 'mark-1',
    parentId: null,
    content: CONTENT,
    author: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    resolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('wikiCommentsKey', () => {
  it('scopes the key by workspace and page', () => {
    expect(wikiCommentsKey('ws-1', 'page-1')).toEqual(COMMENTS_KEY)
  })
})

describe('useWikiComments', () => {
  it('fetches the comments of the page', async () => {
    const comments = [buildWikiComment()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(comments))

    const { result } = renderHookWithProviders(() =>
      useWikiComments('ws-1', 'page-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(comments)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it.each([
    ['workspaceId', '', 'page-1'],
    ['wikiPageId', 'ws-1', ''],
  ])('does not fetch while the %s is missing', (_, ws, page) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useWikiComments(ws, page))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Página não encontrada'))

    const { result } = renderHookWithProviders(() =>
      useWikiComments('ws-1', 'page-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Página não encontrada')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useWikiComments('ws-1', 'page-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar comentários')
  })
})

describe('useCreateWikiComment', () => {
  it('POSTs the mark, content and parent and invalidates only this page', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWikiComment(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateWikiComment('ws-1', 'page-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [])
    queryClient.setQueryData(OTHER_PAGE_KEY, [])

    await act(() =>
      result.current.mutateAsync({
        markId: 'mark-1',
        content: CONTENT,
        parentId: 'comment-0',
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: { markId: 'mark-1', content: CONTENT, parentId: 'comment-0' },
    })
    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_PAGE_KEY)?.isInvalidated).toBe(false)
  })

  it('rejects with the fallback message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateWikiComment('ws-1', 'page-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ markId: 'mark-1', content: CONTENT }),
      ).rejects.toThrow('Erro ao comentar')
    })

    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(false)
  })
})

describe('useUpdateWikiComment', () => {
  it('PATCHes the content of the comment and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWikiComment()),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateWikiComment('ws-1', 'page-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildWikiComment()])

    await act(() =>
      result.current.mutateAsync({ commentId: 'comment-1', content: CONTENT }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/comment-1`,
      method: 'PATCH',
      body: { content: CONTENT },
    })
    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateWikiComment('ws-1', 'page-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ commentId: 'comment-1', content: [] }),
      ).rejects.toThrow('Erro ao editar comentário')
    })
  })
})

describe('useResolveWikiComment', () => {
  it.each([
    true,
    false,
  ])('PATCHes the resolve route with resolved=%s and invalidates the list', async (resolved) => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWikiComment({ resolved })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useResolveWikiComment('ws-1', 'page-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildWikiComment()])

    await act(() =>
      result.current.mutateAsync({ commentId: 'comment-1', resolved }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/comment-1/resolve`,
      method: 'PATCH',
      body: { resolved },
    })
    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(true)
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result } = renderHookWithProviders(() =>
      useResolveWikiComment('ws-1', 'page-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ commentId: 'comment-1', resolved: true }),
      ).rejects.toThrow('Sem permissão')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useResolveWikiComment('ws-1', 'page-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ commentId: 'comment-1', resolved: true }),
      ).rejects.toThrow('Erro ao atualizar a discussão')
    })
  })
})

describe('useDeleteWikiComment', () => {
  it('DELETEs the comment and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteWikiComment('ws-1', 'page-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildWikiComment()])

    await act(() => result.current.mutateAsync('comment-1'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/comment-1`,
      method: 'DELETE',
      body: undefined,
    })
    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteWikiComment('ws-1', 'page-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildWikiComment()])

    await act(async () => {
      await expect(result.current.mutateAsync('comment-1')).rejects.toThrow(
        'Erro ao excluir comentário',
      )
    })

    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(false)
  })
})
