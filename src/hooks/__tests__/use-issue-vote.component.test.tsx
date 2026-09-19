import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueVoteSummaryDTO } from '@/types/issue'
import {
  useCastIssueVote,
  useIssueVotes,
  useRetractIssueVote,
} from '../use-issue-vote'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const VOTES_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}/votes`
const VOTES_KEY = [['issue-votes'], WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID]
const OTHER_ISSUE_KEY = [['issue-votes'], WORKSPACE_ID, PROJECT_SLUG, 'issue-2']

function buildSummary(
  overrides: Partial<IssueVoteSummaryDTO> = {},
): IssueVoteSummaryDTO {
  return { up: 0, down: 0, myVote: null, ...overrides }
}

describe('useIssueVotes', () => {
  it('fetches the vote summary of the issue', async () => {
    const summary = buildSummary({ up: 3, myVote: 'UP' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(summary))

    const { result } = renderHookWithProviders(() =>
      useIssueVotes(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(summary)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: VOTES_URL,
      method: 'GET',
    })
  })

  it('does not fetch without an issue id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueVotes(WORKSPACE_ID, PROJECT_SLUG, ''),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueVotes(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar votos')
  })
})

describe('useCastIssueVote', () => {
  it('POSTs the vote type and writes the returned summary to the cache', async () => {
    const summary = buildSummary({ up: 1, myVote: 'UP' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(summary))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCastIssueVote(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )
    queryClient.setQueryData(VOTES_KEY, buildSummary())
    queryClient.setQueryData(OTHER_ISSUE_KEY, buildSummary({ down: 2 }))

    await act(() => result.current.mutateAsync('UP'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: VOTES_URL,
      method: 'POST',
      body: { type: 'UP' },
    })
    expect(queryClient.getQueryData(VOTES_KEY)).toEqual(summary)
    // The server summary is authoritative: no refetch is scheduled.
    expect(queryClient.getQueryState(VOTES_KEY)?.isInvalidated).toBe(false)
    expect(queryClient.getQueryData(OTHER_ISSUE_KEY)).toEqual(
      buildSummary({ down: 2 }),
    )
  })

  it('seeds the cache even when the summary was never loaded', async () => {
    const summary = buildSummary({ down: 1, myVote: 'DOWN' })
    mockFetch().mockResolvedValueOnce(apiSuccess(summary))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCastIssueVote(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('DOWN'))

    expect(queryClient.getQueryData(VOTES_KEY)).toEqual(summary)
  })

  it('keeps the previous summary when the vote fails', async () => {
    const previous = buildSummary({ up: 2 })
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCastIssueVote(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )
    queryClient.setQueryData(VOTES_KEY, previous)

    await act(async () => {
      await expect(result.current.mutateAsync('UP')).rejects.toThrow(
        'Erro ao votar',
      )
    })

    expect(queryClient.getQueryData(VOTES_KEY)).toEqual(previous)
  })

  it('surfaces the backend message when the vote is rejected', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result } = renderHookWithProviders(() =>
      useCastIssueVote(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('UP')).rejects.toThrow(
        'Sem permissão',
      )
    })
  })
})

describe('useRetractIssueVote', () => {
  it('DELETEs the vote without a body and writes the returned summary', async () => {
    const summary = buildSummary()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(summary))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRetractIssueVote(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )
    queryClient.setQueryData(VOTES_KEY, buildSummary({ up: 1, myVote: 'UP' }))

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toEqual({
      url: VOTES_URL,
      method: 'DELETE',
      body: undefined,
    })
    expect(queryClient.getQueryData(VOTES_KEY)).toEqual(summary)
  })

  it('keeps the previous summary and falls back to the hook message on failure', async () => {
    const previous = buildSummary({ up: 1, myVote: 'UP' })
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRetractIssueVote(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )
    queryClient.setQueryData(VOTES_KEY, previous)

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Erro ao remover voto',
      )
    })

    expect(queryClient.getQueryData(VOTES_KEY)).toEqual(previous)
  })
})
