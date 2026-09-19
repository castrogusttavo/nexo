import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueRelationDTO } from '@/types/issue'
import {
  useCreateIssueRelation,
  useIssueRelations,
  useRemoveIssueRelation,
} from '../use-issue-relation'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const RELATIONS_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}/relations`
const BASE_KEY = [['issue-relations'], WORKSPACE_ID, PROJECT_SLUG]
const SOURCE_KEY = [...BASE_KEY, ISSUE_ID]
// Relations are shown on both issues, so the target's list must refresh too.
const TARGET_KEY = [...BASE_KEY, 'issue-2']
const OTHER_PROJECT_KEY = [
  ['issue-relations'],
  WORKSPACE_ID,
  'other',
  'issue-3',
]

function buildRelation(
  overrides: Partial<IssueRelationDTO> = {},
): IssueRelationDTO {
  return {
    id: 'relation-1',
    sourceId: ISSUE_ID,
    targetId: 'issue-2',
    type: 'RELATES_TO',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMutation<T>(hook: () => T) {
  const rendered = renderHookWithProviders(hook)
  rendered.queryClient.setQueryData(SOURCE_KEY, [buildRelation()])
  rendered.queryClient.setQueryData(TARGET_KEY, [buildRelation()])
  rendered.queryClient.setQueryData(OTHER_PROJECT_KEY, [])
  return rendered
}

function isInvalidated(
  queryClient: ReturnType<typeof renderHookWithProviders>['queryClient'],
  key: readonly unknown[],
) {
  return queryClient.getQueryState(key)?.isInvalidated
}

describe('useIssueRelations', () => {
  it('fetches the relations of the issue', async () => {
    const relations = [buildRelation()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(relations))

    const { result } = renderHookWithProviders(() =>
      useIssueRelations(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(relations)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: RELATIONS_URL,
      method: 'GET',
    })
  })

  it('does not fetch without a workspace id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueRelations('', PROJECT_SLUG, ISSUE_ID),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueRelations(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar relações')
  })
})

describe('useCreateIssueRelation', () => {
  it('POSTs the relation and invalidates both ends within the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildRelation({ type: 'IMPLEMENTS' }), 201),
    )
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueRelation(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() =>
      result.current.mutateAsync({ targetId: 'issue-2', type: 'IMPLEMENTS' }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: RELATIONS_URL,
      method: 'POST',
      body: { targetId: 'issue-2', type: 'IMPLEMENTS' },
    })
    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(true)
    expect(isInvalidated(queryClient, TARGET_KEY)).toBe(true)
    expect(isInvalidated(queryClient, OTHER_PROJECT_KEY)).toBe(false)
  })

  it('surfaces the backend message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Relação já existe'))
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueRelation(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ targetId: 'issue-2', type: 'RELATES_TO' }),
      ).rejects.toThrow('Relação já existe')
    })

    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useCreateIssueRelation(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ targetId: 'issue-2', type: 'RELATES_TO' }),
      ).rejects.toThrow('Erro ao criar relação')
    })
  })
})

describe('useRemoveIssueRelation', () => {
  it('DELETEs the relation and invalidates both ends within the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useRemoveIssueRelation(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('relation-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${RELATIONS_URL}/relation-1`,
      method: 'DELETE',
    })
    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(true)
    expect(isInvalidated(queryClient, TARGET_KEY)).toBe(true)
    expect(isInvalidated(queryClient, OTHER_PROJECT_KEY)).toBe(false)
  })

  it('rejects with the fallback message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderMutation(() =>
      useRemoveIssueRelation(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('relation-1')).rejects.toThrow(
        'Erro ao remover relação',
      )
    })

    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(false)
  })
})
