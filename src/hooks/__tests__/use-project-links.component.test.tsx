import { waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  projectLinksKey,
  useCreateProjectLink,
  useProjectLinks,
  useRemoveProjectLink,
  useUpdateProjectLink,
} from '@/src/hooks/use-project-links'
import type { ProjectLinkDTO } from '@/types/project-link'

const BASE = '/api/workspaces/ws-1/projects/alpha/links'
const KEY = projectLinksKey('ws-1', 'alpha')

const link: ProjectLinkDTO = {
  id: 'l1',
  projectId: 'p1',
  title: 'Site',
  url: 'https://nexopm.com',
  createdById: 'u1',
  createdAt: '2026-11-17T10:00:00.000Z',
}

describe('useProjectLinks', () => {
  it('fetches the links', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess([link]))

    const { result } = renderHookWithProviders(() =>
      useProjectLinks('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([link])
    expect(getFetchCall(fetchSpy)).toMatchObject({ url: BASE, method: 'GET' })
  })
})

describe('link mutations', () => {
  it('POSTs a new link and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(link, 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProjectLink('ws-1', 'alpha'),
    )
    queryClient.setQueryData(KEY, [])

    await act(async () => {
      await result.current.mutateAsync({ url: link.url, title: 'Site' })
    })

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE,
      method: 'POST',
      body: { url: link.url, title: 'Site' },
    })
    // Nothing observes the list here, so it is marked stale rather than
    // refetched: that is what tells the next mount to load it again.
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it('PATCHes a link, sending null to clear the title', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(link))
    const { result } = renderHookWithProviders(() =>
      useUpdateProjectLink('ws-1', 'alpha'),
    )

    await act(async () => {
      await result.current.mutateAsync({ linkId: 'l1', data: { title: null } })
    })

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE}/l1`,
      method: 'PATCH',
      body: { title: null },
    })
  })

  it('DELETEs a link', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(null))
    const { result } = renderHookWithProviders(() =>
      useRemoveProjectLink('ws-1', 'alpha'),
    )

    await act(async () => {
      await result.current.mutateAsync('l1')
    })

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE}/l1`,
      method: 'DELETE',
    })
  })

  it('surfaces the API error without touching the cache', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(
        409,
        'Um projeto pode ter no máximo 20 links',
        'PROJECT_LINK_LIMIT_REACHED',
      ),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProjectLink('ws-1', 'alpha'),
    )
    queryClient.setQueryData(KEY, [link])

    await act(async () => {
      await result.current
        .mutateAsync({ url: 'https://a.com' })
        .catch(() => undefined)
    })

    await waitFor(() =>
      expect(result.current.error?.message).toBe(
        'Um projeto pode ter no máximo 20 links',
      ),
    )
    expect(queryClient.getQueryData(KEY)).toEqual([link])
  })
})
