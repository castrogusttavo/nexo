import { waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  projectReactionsKey,
  useProjectReactions,
  useToggleProjectReaction,
} from '@/src/hooks/use-project-reactions'
import type { ProjectReactionSummaryDTO } from '@/types/project-reaction'

const BASE = '/api/workspaces/ws-1/projects/alpha/reactions'
const KEY = projectReactionsKey('ws-1', 'alpha')

const seed: ProjectReactionSummaryDTO[] = [
  { emoji: '🔥', count: 1, reactedByMe: false },
]

describe('useProjectReactions', () => {
  it('fetches the reaction summary', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(seed))

    const { result } = renderHookWithProviders(() =>
      useProjectReactions('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(seed)
    expect(getFetchCall(fetchSpy)).toMatchObject({ url: BASE, method: 'GET' })
  })

  it('does not fetch without a workspace id or slug', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useProjectReactions('', ''))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('useToggleProjectReaction', () => {
  it('PUTs the encoded emoji and shows the reaction before the server answers', async () => {
    const pending = deferredResponse()
    const fetchSpy = mockFetch()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(apiSuccess(seed))
    const { result, queryClient } = renderHookWithProviders(() =>
      useToggleProjectReaction('ws-1', 'alpha'),
    )
    queryClient.setQueryData(KEY, seed)

    act(() => {
      result.current.mutate({ emoji: '👍', reacted: true })
    })

    await waitFor(() =>
      expect(queryClient.getQueryData(KEY)).toEqual([
        ...seed,
        { emoji: '👍', count: 1, reactedByMe: true },
      ]),
    )
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE}/${encodeURIComponent('👍')}`,
      method: 'PUT',
    })

    await act(async () => {
      pending.resolve(apiSuccess(null))
    })
  })

  it('DELETEs when taking the reaction back', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useToggleProjectReaction('ws-1', 'alpha'),
    )
    queryClient.setQueryData(KEY, [
      { emoji: '🔥', count: 1, reactedByMe: true },
    ])

    await act(async () => {
      await result.current.mutateAsync({ emoji: '🔥', reacted: false })
    })

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE}/${encodeURIComponent('🔥')}`,
      method: 'DELETE',
    })
  })

  it('rolls the cache back when the request fails', async () => {
    mockFetch()
      .mockResolvedValueOnce(apiError(403, 'Sem acesso', 'PROJECT_FORBIDDEN'))
      .mockResolvedValue(apiSuccess(seed))
    const { result, queryClient } = renderHookWithProviders(() =>
      useToggleProjectReaction('ws-1', 'alpha'),
    )
    queryClient.setQueryData(KEY, seed)

    await act(async () => {
      await result.current
        .mutateAsync({ emoji: '👍', reacted: true })
        .catch(() => undefined)
    })

    await waitFor(() => expect(queryClient.getQueryData(KEY)).toEqual(seed))
  })
})
