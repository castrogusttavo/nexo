import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { LabelDTO } from '@/types/label'
import {
  useCreateLabel,
  useDeleteLabel,
  useLabels,
  useUpdateLabel,
} from '../use-label'

const labelsKey = (workspaceId = 'ws-1', projectSlug = 'alpha') =>
  [['labels'], workspaceId, projectSlug] as const

const BASE_URL = '/api/workspaces/ws-1/projects/alpha/labels'

function buildLabel(overrides: Partial<LabelDTO> = {}): LabelDTO {
  return {
    id: 'label-1',
    name: 'bug',
    description: null,
    color: 'RED',
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useLabels', () => {
  it('fetches the labels of the project', async () => {
    const labels = [buildLabel(), buildLabel({ id: 'label-2', name: 'feat' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(labels))

    const { result } = renderHookWithProviders(() => useLabels('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(labels)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it.each([
    ['workspace id', '', 'alpha'],
    ['project slug', 'ws-1', ''],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useLabels(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso'))

    const { result } = renderHookWithProviders(() => useLabels('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useLabels('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar labels')
  })
})

describe('useCreateLabel', () => {
  it('POSTs the label and invalidates only this project labels', async () => {
    const input = { name: 'bug', color: 'RED' as const }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildLabel(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateLabel('ws-1', 'alpha'),
    )
    queryClient.setQueryData(labelsKey(), [])
    queryClient.setQueryData(labelsKey('ws-1', 'beta'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(labelsKey('ws-1', 'beta'))?.isInvalidated,
    ).toBe(false)
  })

  it('surfaces the backend message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Label já existe'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateLabel('ws-1', 'alpha'),
    )
    queryClient.setQueryData(labelsKey(), [])

    await act(async () => {
      await expect(result.current.mutateAsync({ name: 'bug' })).rejects.toThrow(
        'Label já existe',
      )
    })

    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useCreateLabel('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync({ name: 'bug' })).rejects.toThrow(
        'Erro ao criar label',
      )
    })
  })
})

describe('useUpdateLabel', () => {
  it('PATCHes only the data payload to the label url and invalidates the labels', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildLabel({ color: 'BLUE' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateLabel('ws-1', 'alpha'),
    )
    queryClient.setQueryData(labelsKey(), [buildLabel()])

    await act(() =>
      result.current.mutateAsync({
        labelId: 'label-1',
        data: { color: 'BLUE' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/label-1`,
      method: 'PATCH',
      body: { color: 'BLUE' },
    })
    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateLabel('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ labelId: 'label-1', data: {} }),
      ).rejects.toThrow('Erro ao atualizar label')
    })
  })
})

describe('useDeleteLabel', () => {
  it('DELETEs the label and invalidates the labels', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteLabel('ws-1', 'alpha'),
    )
    queryClient.setQueryData(labelsKey(), [buildLabel()])

    await act(() => result.current.mutateAsync('label-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/label-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteLabel('ws-1', 'alpha'),
    )
    queryClient.setQueryData(labelsKey(), [buildLabel()])

    await act(async () => {
      await expect(result.current.mutateAsync('label-1')).rejects.toThrow(
        'Erro ao excluir label',
      )
    })

    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(false)
  })
})
