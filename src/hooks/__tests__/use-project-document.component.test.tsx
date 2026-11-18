import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDocumentDTO } from '@/types/project-document'
import {
  projectDocumentKey,
  useProjectDocument,
  useSaveProjectDocument,
} from '../use-project-document'

const URL = '/api/workspaces/ws-1/projects/alpha/document'
const KEY = projectDocumentKey('ws-1', 'alpha')

const doc: ProjectDocumentDTO = {
  content: [{ type: 'p', children: [{ text: 'oi' }] }],
  updatedAt: '2026-11-16T10:00:00.000Z',
}

describe('useProjectDocument', () => {
  it('fetches the document snapshot of the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(doc))

    const { result } = renderHookWithProviders(() =>
      useProjectDocument('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(doc)
    expect(getFetchCall(fetchSpy)).toMatchObject({ url: URL, method: 'GET' })
  })

  it('does not fetch without a workspace id or slug', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useProjectDocument('', ''))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the API error', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(403, 'Sem acesso', 'PROJECT_FORBIDDEN'),
    )

    const { result } = renderHookWithProviders(() =>
      useProjectDocument('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useSaveProjectDocument', () => {
  it('PUTs the content and writes the saved snapshot to the cache', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(doc))
    const { result, queryClient } = renderHookWithProviders(() =>
      useSaveProjectDocument('ws-1', 'alpha'),
    )

    await act(async () => {
      await result.current.mutateAsync(doc.content as never)
    })

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: URL,
      method: 'PUT',
      body: { content: doc.content },
    })
    expect(queryClient.getQueryData(KEY)).toEqual(doc)
  })

  it('leaves the cache alone when the save fails', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(403, 'Sem acesso', 'PROJECT_FORBIDDEN'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useSaveProjectDocument('ws-1', 'alpha'),
    )

    await act(async () => {
      await result.current.mutateAsync([]).catch(() => undefined)
    })

    expect(queryClient.getQueryData(KEY)).toBeUndefined()
  })
})
