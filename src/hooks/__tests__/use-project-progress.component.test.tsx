import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectProgressDTO } from '@/types/project-progress'
import { useProjectProgress } from '../use-project-progress'

const progress: ProjectProgressDTO = {
  total: 7,
  completionPercentage: 0,
  groups: [{ group: 'BACKLOG', count: 3, percentage: 43 }],
}

describe('useProjectProgress', () => {
  it('fetches the progress of the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(progress))

    const { result } = renderHookWithProviders(() =>
      useProjectProgress('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(progress)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/alpha/progress',
      method: 'GET',
    })
  })

  it('does not fetch without a workspace id or slug', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useProjectProgress('', ''))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
