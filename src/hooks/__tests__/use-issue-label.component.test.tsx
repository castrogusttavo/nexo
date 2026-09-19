import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueLabelDTO } from '@/types/issue'
import {
  useAddIssueLabel,
  useIssueLabels,
  useRemoveIssueLabel,
} from '../use-issue-label'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const LABELS_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}/labels`
const LABELS_KEY = [['issue-labels'], WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID]
const OTHER_ISSUE_KEY = [
  ['issue-labels'],
  WORKSPACE_ID,
  PROJECT_SLUG,
  'issue-2',
]

function buildIssueLabel(
  overrides: Partial<IssueLabelDTO> = {},
): IssueLabelDTO {
  return {
    id: 'issue-label-1',
    issueId: ISSUE_ID,
    labelId: 'label-1',
    label: {
      id: 'label-1',
      name: 'bug',
      description: null,
      color: 'RED',
      projectId: 'project-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMutation<T>(hook: () => T) {
  const rendered = renderHookWithProviders(hook)
  rendered.queryClient.setQueryData(LABELS_KEY, [buildIssueLabel()])
  rendered.queryClient.setQueryData(OTHER_ISSUE_KEY, [])
  return rendered
}

describe('useIssueLabels', () => {
  it('fetches the labels of the issue', async () => {
    const labels = [buildIssueLabel()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(labels))

    const { result } = renderHookWithProviders(() =>
      useIssueLabels(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(labels)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: LABELS_URL,
      method: 'GET',
    })
  })

  it('does not fetch without a project slug', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueLabels(WORKSPACE_ID, '', ISSUE_ID),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueLabels(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar labels da issue')
  })
})

describe('useAddIssueLabel', () => {
  it('POSTs the label id and invalidates only this issue labels', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildIssueLabel({ labelId: 'label-2' }), 201),
    )
    const { result, queryClient } = renderMutation(() =>
      useAddIssueLabel(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('label-2'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: LABELS_URL,
      method: 'POST',
      body: { labelId: 'label-2' },
    })
    expect(queryClient.getQueryState(LABELS_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_ISSUE_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('surfaces the backend message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Label não encontrada'))
    const { result, queryClient } = renderMutation(() =>
      useAddIssueLabel(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('label-9')).rejects.toThrow(
        'Label não encontrada',
      )
    })

    expect(queryClient.getQueryState(LABELS_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useAddIssueLabel(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('label-2')).rejects.toThrow(
        'Erro ao adicionar label',
      )
    })
  })
})

describe('useRemoveIssueLabel', () => {
  it('DELETEs the label by id and invalidates the issue labels', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useRemoveIssueLabel(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('label-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${LABELS_URL}/label-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(LABELS_KEY)?.isInvalidated).toBe(true)
  })

  it('rejects with the fallback message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderMutation(() =>
      useRemoveIssueLabel(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('label-1')).rejects.toThrow(
        'Erro ao remover label',
      )
    })

    expect(queryClient.getQueryState(LABELS_KEY)?.isInvalidated).toBe(false)
  })
})
