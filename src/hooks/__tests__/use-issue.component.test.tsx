import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import {
  issuesKey,
  useCreateIssue,
  useDeleteIssue,
  useIssueByIdentifier,
  useIssueChildren,
  useIssues,
  useUpdateIssue,
} from '../use-issue'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUES_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues`

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
    number: 1,
    title: 'Fix login',
    description: [{ type: 'p', children: [{ text: '' }] }],
    priority: 'NONE',
    startDate: null,
    dueDate: null,
    stateId: 'state-1',
    typeId: 'type-1',
    cycleId: null,
    moduleId: null,
    labelIds: [],
    assigneeIds: [],
    estimateValueId: null,
    authorId: 'user-1',
    projectId: 'project-1',
    parentId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('issuesKey', () => {
  it('scopes the key by workspace and project', () => {
    expect(issuesKey(WORKSPACE_ID, PROJECT_SLUG)).toEqual([
      ['issues'],
      WORKSPACE_ID,
      PROJECT_SLUG,
    ])
  })
})

describe('useIssues', () => {
  it('fetches the first page with the page limit and flattens the items', async () => {
    const issues = [buildIssue(), buildIssue({ id: 'issue-2', number: 2 })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ items: issues, nextCursor: null }),
    )

    const { result } = renderHookWithProviders(() =>
      useIssues(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(issues)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUES_URL}?limit=1000`,
      method: 'GET',
    })
  })

  it('keeps fetching pages with the cursor until there is no next page', async () => {
    const first = buildIssue({ id: 'issue-1', number: 1 })
    const second = buildIssue({ id: 'issue-2', number: 2 })
    const fetchSpy = mockFetch()
      .mockResolvedValueOnce(apiSuccess({ items: [first], nextCursor: 1000 }))
      .mockResolvedValueOnce(apiSuccess({ items: [second], nextCursor: null }))

    const { result } = renderHookWithProviders(() =>
      useIssues(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    await waitFor(() => expect(result.current.hasNextPage).toBe(false))
    expect(result.current.data).toEqual([first, second])
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(getFetchCall(fetchSpy, 1).url).toBe(
      `${ISSUES_URL}?limit=1000&cursor=1000`,
    )
  })

  it('does not fetch while the workspace or project is missing', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssues('', PROJECT_SLUG),
    )
    renderHookWithProviders(() => useIssues(WORKSPACE_ID, ''))

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso ao projeto'))

    const { result } = renderHookWithProviders(() =>
      useIssues(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso ao projeto')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssues(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar issues')
  })
})

describe('useCreateIssue', () => {
  it('POSTs the issue and invalidates every query of the project', async () => {
    const created = buildIssue()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(created, 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateIssue(WORKSPACE_ID, PROJECT_SLUG),
    )
    const listKey = issuesKey(WORKSPACE_ID, PROJECT_SLUG)
    const childrenKey = [...listKey, 'issue-9', 'children']
    const otherProjectKey = issuesKey(WORKSPACE_ID, 'other')
    queryClient.setQueryData(listKey, { pages: [], pageParams: [] })
    queryClient.setQueryData(childrenKey, [])
    queryClient.setQueryData(otherProjectKey, { pages: [], pageParams: [] })

    const input = {
      title: 'Fix login',
      description: created.description,
      stateId: 'state-1',
      priority: 'HIGH' as const,
    }
    let returned: IssueDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(input)
    })

    expect(returned).toEqual(created)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: ISSUES_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(childrenKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherProjectKey)?.isInvalidated).toBe(
      false,
    )
  })

  it('rejects with the fallback message and leaves the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateIssue(WORKSPACE_ID, PROJECT_SLUG),
    )
    const listKey = issuesKey(WORKSPACE_ID, PROJECT_SLUG)
    queryClient.setQueryData(listKey, { pages: [], pageParams: [] })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          title: 'x',
          description: [],
          stateId: 'state-1',
        }),
      ).rejects.toThrow('Erro ao criar issue')
    })

    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(false)
  })
})

describe('useUpdateIssue', () => {
  it('PATCHes the issue by id and invalidates the project issues', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildIssue({ dueDate: null })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateIssue(WORKSPACE_ID, PROJECT_SLUG),
    )
    const listKey = issuesKey(WORKSPACE_ID, PROJECT_SLUG)
    queryClient.setQueryData(listKey, { pages: [], pageParams: [] })

    await act(() =>
      result.current.mutateAsync({
        issueId: 'issue-1',
        data: { dueDate: null, cycleId: 'cycle-1' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${ISSUES_URL}/issue-1`,
      method: 'PATCH',
      body: { dueDate: null, cycleId: 'cycle-1' },
    })
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
  })

  it('surfaces the backend message when the update fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Issue não encontrada'))
    const { result } = renderHookWithProviders(() =>
      useUpdateIssue(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ issueId: 'issue-1', data: {} }),
      ).rejects.toThrow('Issue não encontrada')
    })
  })
})

describe('useDeleteIssue', () => {
  it('DELETEs the issue and invalidates the project issues', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteIssue(WORKSPACE_ID, PROJECT_SLUG),
    )
    const listKey = issuesKey(WORKSPACE_ID, PROJECT_SLUG)
    queryClient.setQueryData(listKey, { pages: [], pageParams: [] })

    await act(() => result.current.mutateAsync('issue-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUES_URL}/issue-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
  })

  it('rejects with the fallback message when the delete fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useDeleteIssue(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('issue-1')).rejects.toThrow(
        'Erro ao excluir issue',
      )
    })
  })
})

describe('useIssueChildren', () => {
  it('fetches the sub-issues of an issue', async () => {
    const children = [buildIssue({ id: 'child-1', parentId: 'issue-1' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(children))

    const { result } = renderHookWithProviders(() =>
      useIssueChildren(WORKSPACE_ID, PROJECT_SLUG, 'issue-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(children)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUES_URL}/issue-1/children`,
      method: 'GET',
    })
  })

  it('does not fetch without an issue id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueChildren(WORKSPACE_ID, PROJECT_SLUG, ''),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueChildren(WORKSPACE_ID, PROJECT_SLUG, 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar sub-issues')
  })
})

describe('useIssueByIdentifier', () => {
  it('fetches the issue by its human identifier', async () => {
    const issue = buildIssue({ number: 42 })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(issue))

    const { result } = renderHookWithProviders(() =>
      useIssueByIdentifier(WORKSPACE_ID, PROJECT_SLUG, 'NEX-42'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(issue)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${ISSUES_URL}/by-identifier/NEX-42`,
      method: 'GET',
    })
  })

  it('does not fetch while the identifier is undefined', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueByIdentifier(WORKSPACE_ID, PROJECT_SLUG, undefined),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the issue is not found', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Issue não encontrada'))

    const { result } = renderHookWithProviders(() =>
      useIssueByIdentifier(WORKSPACE_ID, PROJECT_SLUG, 'NEX-404'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Issue não encontrada')
  })
})
