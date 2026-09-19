import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueUpdateDTO } from '@/types/issue-update'
import {
  useCreateIssueUpdate,
  useDeleteIssueUpdate,
  useEditIssueUpdate,
  useIssueUpdates,
} from '../use-issue-update'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const UPDATES_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}/updates`
const UPDATES_KEY = [['issue-updates'], WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID]
const OTHER_ISSUE_KEY = [
  ['issue-updates'],
  WORKSPACE_ID,
  PROJECT_SLUG,
  'issue-2',
]

function buildIssueUpdate(
  overrides: Partial<IssueUpdateDTO> = {},
): IssueUpdateDTO {
  return {
    id: 'update-1',
    status: 'ON_TRACK',
    content: 'All good',
    issueId: ISSUE_ID,
    author: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    editedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMutation<T>(hook: () => T) {
  const rendered = renderHookWithProviders(hook)
  rendered.queryClient.setQueryData(UPDATES_KEY, [buildIssueUpdate()])
  rendered.queryClient.setQueryData(OTHER_ISSUE_KEY, [])
  return rendered
}

describe('useIssueUpdates', () => {
  it('fetches the updates of the issue', async () => {
    const updates = [buildIssueUpdate()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(updates))

    const { result } = renderHookWithProviders(() =>
      useIssueUpdates(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(updates)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: UPDATES_URL,
      method: 'GET',
    })
  })

  it.each([
    ['workspace', '', PROJECT_SLUG, ISSUE_ID],
    ['project', WORKSPACE_ID, '', ISSUE_ID],
    ['issue', WORKSPACE_ID, PROJECT_SLUG, ''],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug, issueId) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueUpdates(workspaceId, projectSlug, issueId),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))

    const { result } = renderHookWithProviders(() =>
      useIssueUpdates(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem permissão')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueUpdates(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar updates')
  })
})

describe('useCreateIssueUpdate', () => {
  it('POSTs the update and invalidates only this issue updates', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildIssueUpdate({ status: 'AT_RISK' }), 201),
    )
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() =>
      result.current.mutateAsync({ status: 'AT_RISK', content: 'Blocked' }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: UPDATES_URL,
      method: 'POST',
      body: { status: 'AT_RISK', content: 'Blocked' },
    })
    expect(queryClient.getQueryState(UPDATES_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_ISSUE_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('rejects with the fallback message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ status: 'ON_TRACK' }),
      ).rejects.toThrow('Erro ao postar update')
    })

    expect(queryClient.getQueryState(UPDATES_KEY)?.isInvalidated).toBe(false)
  })
})

describe('useEditIssueUpdate', () => {
  it('PATCHes the update by id and invalidates the issue updates', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildIssueUpdate({ status: 'OFF_TRACK' })),
    )
    const { result, queryClient } = renderMutation(() =>
      useEditIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() =>
      result.current.mutateAsync({
        updateId: 'update-1',
        data: { status: 'OFF_TRACK' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${UPDATES_URL}/update-1`,
      method: 'PATCH',
      body: { status: 'OFF_TRACK' },
    })
    expect(queryClient.getQueryState(UPDATES_KEY)?.isInvalidated).toBe(true)
  })

  it('surfaces the backend message when the edit fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Apenas o autor edita'))
    const { result } = renderMutation(() =>
      useEditIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          updateId: 'update-1',
          data: { status: 'ON_TRACK' },
        }),
      ).rejects.toThrow('Apenas o autor edita')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useEditIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          updateId: 'update-1',
          data: { status: 'ON_TRACK' },
        }),
      ).rejects.toThrow('Erro ao editar update')
    })
  })
})

describe('useDeleteIssueUpdate', () => {
  it('DELETEs the update and invalidates the issue updates', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useDeleteIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('update-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${UPDATES_URL}/update-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(UPDATES_KEY)?.isInvalidated).toBe(true)
  })

  it('rejects with the fallback message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderMutation(() =>
      useDeleteIssueUpdate(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('update-1')).rejects.toThrow(
        'Erro ao excluir update',
      )
    })

    expect(queryClient.getQueryState(UPDATES_KEY)?.isInvalidated).toBe(false)
  })
})
