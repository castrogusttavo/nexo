import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { CommentDTO } from '@/types/comment'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../use-comment'

const BASE_URL = '/api/workspaces/ws-1/projects/nexo/issues/issue-1/comments'
const COMMENTS_KEY = [['comments'], 'ws-1', 'nexo', 'issue-1']
const OTHER_ISSUE_KEY = [['comments'], 'ws-1', 'nexo', 'issue-2']

const CONTENT = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Oi' }] }],
}

function buildComment(overrides: Partial<CommentDTO> = {}): CommentDTO {
  return {
    id: 'comment-1',
    content: CONTENT,
    issueId: 'issue-1',
    parentId: null,
    author: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    editedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useComments', () => {
  it('fetches the comments of the issue', async () => {
    const comments = [buildComment()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(comments))

    const { result } = renderHookWithProviders(() =>
      useComments('ws-1', 'nexo', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(comments)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it.each([
    ['workspaceId', '', 'nexo', 'issue-1'],
    ['projectSlug', 'ws-1', '', 'issue-1'],
    ['issueId', 'ws-1', 'nexo', ''],
  ])('does not fetch while the %s is missing', (_, ws, slug, issue) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useComments(ws, slug, issue),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso ao projeto'))

    const { result } = renderHookWithProviders(() =>
      useComments('ws-1', 'nexo', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso ao projeto')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useComments('ws-1', 'nexo', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar comentários')
  })
})

describe('useCreateComment', () => {
  it('POSTs the content and parent and invalidates only this issue list', async () => {
    const created = buildComment({ id: 'comment-2', parentId: 'comment-1' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(created, 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateComment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [])
    queryClient.setQueryData(OTHER_ISSUE_KEY, [])

    let returned: CommentDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({
        content: CONTENT,
        parentId: 'comment-1',
      })
    })

    expect(returned).toEqual(created)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: { content: CONTENT, parentId: 'comment-1' },
    })
    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_ISSUE_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('rejects with the fallback message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateComment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ content: CONTENT }),
      ).rejects.toThrow('Erro ao comentar')
    })

    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(false)
  })
})

describe('useUpdateComment', () => {
  it('PATCHes only the content of the comment and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildComment({ editedAt: '2026-01-02T00:00:00.000Z' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateComment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildComment()])

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

  it('surfaces the backend message when the edit is refused', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Você não é o autor'))
    const { result } = renderHookWithProviders(() =>
      useUpdateComment('ws-1', 'nexo', 'issue-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ commentId: 'comment-1', content: {} }),
      ).rejects.toThrow('Você não é o autor')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateComment('ws-1', 'nexo', 'issue-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ commentId: 'comment-1', content: {} }),
      ).rejects.toThrow('Erro ao editar comentário')
    })
  })
})

describe('useDeleteComment', () => {
  it('DELETEs the comment and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteComment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildComment()])

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
      useDeleteComment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(COMMENTS_KEY, [buildComment()])

    await act(async () => {
      await expect(result.current.mutateAsync('comment-1')).rejects.toThrow(
        'Erro ao excluir comentário',
      )
    })

    expect(queryClient.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(false)
  })
})
