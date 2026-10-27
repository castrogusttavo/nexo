import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildProjectLabelDTO } from '@/src/__tests__/factories/dto/project-label.dto'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  useCreateProjectLabel,
  useDeleteProjectLabel,
  useProjectLabels,
  useUpdateProjectLabel,
} from '../use-project-label'

const labelsKey = (workspaceId = 'ws-1') =>
  [['project-labels'], workspaceId] as const
const projectsKey = (workspaceId = 'ws-1') =>
  [['projects'], workspaceId] as const

const BASE_URL = '/api/workspaces/ws-1/project-labels'

describe('useProjectLabels', () => {
  it('fetches the labels of the4 workspace', async () => {
    const labels = [
      buildProjectLabelDTO(),
      buildProjectLabelDTO({ id: 'plabel-2', name: 'Vendas' }),
    ]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(labels))

    const { result } = renderHookWithProviders(() => useProjectLabels('ws-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(labels)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it('does not fetch without a workspace id', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useProjectLabels(''))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useProjectLabels('ws-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar etiquetas de projeto',
    )
  })
})

describe('useCreateProjectLabel', () => {
  it('POSTs the label invalidates only this workspace labels', async () => {
    const input = { name: 'Marketing', color: 'YELLOW' as const }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProjectLabelDTO(input), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProjectLabel('ws-1'),
    )
    queryClient.setQueryData(labelsKey(), [])
    queryClient.setQueryData(labelsKey('ws-2'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(labelsKey('ws-2'))?.isInvalidated).toBe(
      false,
    )
  })

  it('surfaces a taken name and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Já existe uma etiqueta de projeto com esse nome'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProjectLabel('ws-1'),
    )
    queryClient.setQueryData(labelsKey(), [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Marketing' }),
      ).rejects.toThrow('Já existe uma etiqueta de projeto com esse nome')
    })

    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(false)
  })
})

describe('useUpdateProjectLabel', () => {
  it('PATCHes only the data paylooad to the label url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProjectLabelDTO({ name: 'Vendas' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateProjectLabel('ws-1'),
    )
    queryClient.setQueryData(labelsKey(), [buildProjectLabelDTO()])

    await act(() =>
      result.current.mutateAsync({
        labelId: 'plabel-1',
        data: { name: 'Vendas', color: 'GREEN' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/plabel-1`,
      method: 'PATCH',
      body: { name: 'Vendas', color: 'GREEN' },
    })
    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the look message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateProjectLabel('ws-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          labelId: 'plabel-1',
          data: { name: 'X' },
        }),
      ).rejects.toThrow('Erro ao atualizar etiqueta de projeto')
    })
  })
})

describe('useDeleteProjectLabel', () => {
  it('DELETEs the label and invalidates the labels and the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteProjectLabel('ws-1'),
    )
    queryClient.setQueryData(labelsKey(), [buildProjectLabelDTO()])
    queryClient.setQueryData(projectsKey(), [])

    await act(() => result.current.mutateAsync('plabel-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/plabel-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(projectsKey())?.isInvalidated).toBe(true)
  })

  it('surfaces the refusal and keeps both caches valid', async () => {
    mockFetch().mockResolvedValue(
      apiError(
        403,
        'Apenas OWNER ou ADMIN podem configurar as etiquetas de projeto',
      ),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteProjectLabel('ws-1'),
    )
    queryClient.setQueryData(labelsKey(), [buildProjectLabelDTO()])
    queryClient.setQueryData(projectsKey(), [])

    await act(async () => {
      await expect(result.current.mutateAsync('plabel-1')).rejects.toThrow(
        'Apenas OWNER ou ADMIN podem configurar as etiquetas de projeto',
      )
    })

    expect(queryClient.getQueryState(labelsKey())?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(projectsKey())?.isInvalidated).toBe(false)
  })
})
