import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ActivityDTO, ActivityEntityTypeDTO } from '@/types/activity'
import { useActivities } from '../use-activity'

function buildActivity(overrides: Partial<ActivityDTO> = {}): ActivityDTO {
  return {
    id: 'activity-1',
    entityType: 'ISSUE',
    entityId: 'issue-1',
    field: 'state',
    oldValue: 'TODO',
    newValue: 'DONE',
    actor: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useActivities', () => {
  it('fetches the activities of one entity inside a project', async () => {
    const activities = [buildActivity()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(activities))

    const { result } = renderHookWithProviders(() =>
      useActivities('ws-1', 'core', 'ISSUE', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(activities)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/core/activities?entityType=ISSUE&entityId=issue-1',
      method: 'GET',
    })
  })

  it('refetches when the entity changes and keeps each one cached', async () => {
    const issueActivity = buildActivity()
    const cycleActivity = buildActivity({
      id: 'activity-2',
      entityType: 'CYCLE',
      entityId: 'cycle-1',
    })
    const fetchSpy = mockFetch()
      .mockResolvedValueOnce(apiSuccess([issueActivity]))
      .mockResolvedValueOnce(apiSuccess([cycleActivity]))
    let args: [string, string, ActivityEntityTypeDTO, string] = [
      'ws-1',
      'core',
      'ISSUE',
      'issue-1',
    ]

    const { result, rerender, queryClient } = renderHookWithProviders(() =>
      useActivities(...args),
    )
    await waitFor(() => expect(result.current.data).toEqual([issueActivity]))

    args = ['ws-1', 'core', 'CYCLE', 'cycle-1']
    rerender()

    await waitFor(() => expect(result.current.data).toEqual([cycleActivity]))
    expect(getFetchCall(fetchSpy, 1).url).toBe(
      '/api/workspaces/ws-1/projects/core/activities?entityType=CYCLE&entityId=cycle-1',
    )
    expect(
      queryClient.getQueryData([
        ['activities'],
        'ws-1',
        'core',
        'ISSUE',
        'issue-1',
      ]),
    ).toEqual([issueActivity])
  })

  it.each<[string, [string, string, ActivityEntityTypeDTO, string]]>([
    ['workspaceId', ['', 'core', 'ISSUE', 'issue-1']],
    ['projectSlug', ['ws-1', '', 'ISSUE', 'issue-1']],
    ['entityType', ['ws-1', 'core', '' as ActivityEntityTypeDTO, 'issue-1']],
    ['entityId', ['ws-1', 'core', 'ISSUE', '']],
  ])('does not fetch while %s is missing', (_field, args) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useActivities(...args))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Issue não encontrada'))

    const { result } = renderHookWithProviders(() =>
      useActivities('ws-1', 'core', 'ISSUE', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Issue não encontrada')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useActivities('ws-1', 'core', 'ISSUE', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar histórico de atividades',
    )
  })
})
