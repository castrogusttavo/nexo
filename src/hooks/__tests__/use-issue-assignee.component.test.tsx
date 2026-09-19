import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueAssigneeDTO } from '@/types/issue'
import {
  useAssignIssue,
  useIssueAssignees,
  useSubscribeIssue,
  useUnassignIssue,
  useUnsubscribeIssue,
} from '../use-issue-assignee'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const ISSUE_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}`
const ASSIGNEES_KEY = [
  ['issue-assignees'],
  WORKSPACE_ID,
  PROJECT_SLUG,
  ISSUE_ID,
]
const OTHER_ISSUE_KEY = [
  ['issue-assignees'],
  WORKSPACE_ID,
  PROJECT_SLUG,
  'issue-2',
]

function buildAssignee(
  overrides: Partial<IssueAssigneeDTO> = {},
): IssueAssigneeDTO {
  return {
    id: 'assignee-1',
    issueId: ISSUE_ID,
    userId: 'user-1',
    user: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMutation<T>(hook: () => T) {
  const rendered = renderHookWithProviders(hook)
  rendered.queryClient.setQueryData(ASSIGNEES_KEY, [buildAssignee()])
  rendered.queryClient.setQueryData(OTHER_ISSUE_KEY, [])
  return rendered
}

describe('useIssueAssignees', () => {
  it('fetches the assignees of the issue', async () => {
    const assignees = [buildAssignee()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(assignees))

    const { result } = renderHookWithProviders(() =>
      useIssueAssignees(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(assignees)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUE_URL}/assignees`,
      method: 'GET',
    })
  })

  it('does not fetch without an issue id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueAssignees(WORKSPACE_ID, PROJECT_SLUG, ''),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueAssignees(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar responsáveis')
  })
})

describe('useAssignIssue', () => {
  it('POSTs the user id and invalidates only this issue assignees', async () => {
    const assignee = buildAssignee({ userId: 'user-2' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(assignee, 201),
    )
    const { result, queryClient } = renderMutation(() =>
      useAssignIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    let returned: IssueAssigneeDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync('user-2')
    })

    expect(returned).toEqual(assignee)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${ISSUE_URL}/assignees`,
      method: 'POST',
      body: { userId: 'user-2' },
    })
    expect(queryClient.getQueryState(ASSIGNEES_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_ISSUE_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('surfaces the backend message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Usuário já atribuído'))
    const { result, queryClient } = renderMutation(() =>
      useAssignIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Usuário já atribuído',
      )
    })

    expect(queryClient.getQueryState(ASSIGNEES_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useAssignIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Erro ao atribuir responsável',
      )
    })
  })
})

describe('useUnassignIssue', () => {
  it('DELETEs the assignee by user id and invalidates the assignees', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useUnassignIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('user-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUE_URL}/assignees/user-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(ASSIGNEES_KEY)?.isInvalidated).toBe(true)
  })

  it('rejects with the fallback message when the removal fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useUnassignIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Erro ao remover responsável',
      )
    })
  })
})

describe('useSubscribeIssue', () => {
  it('POSTs to the subscribe endpoint without touching the assignees cache', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useSubscribeIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUE_URL}/subscribe`,
      method: 'POST',
    })
    expect(queryClient.getQueryState(ASSIGNEES_KEY)?.isInvalidated).toBe(false)
  })

  it('rejects with the fallback message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useSubscribeIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao se inscrever na issue',
      )
    })
  })
})

describe('useUnsubscribeIssue', () => {
  it('DELETEs the subscription', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result } = renderHookWithProviders(() =>
      useUnsubscribeIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUE_URL}/subscribe`,
      method: 'DELETE',
    })
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Inscrição não encontrada'))
    const { result } = renderHookWithProviders(() =>
      useUnsubscribeIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Inscrição não encontrada',
      )
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUnsubscribeIssue(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao cancelar inscrição na issue',
      )
    })
  })
})
