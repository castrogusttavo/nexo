import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { EstimateSettingsDTO, EstimateValueDTO } from '@/types/estimate'
import {
  useCreateEstimateValue,
  useDeleteEstimateValue,
  useEstimateSettings,
  useReorderEstimateValues,
  useUpdateEstimateSettings,
  useUpdateEstimateValue,
} from '../use-estimate'

const estimateKey = (workspaceId = 'ws-1', projectSlug = 'alpha') =>
  [['estimate-settings'], workspaceId, projectSlug] as const

const BASE_URL = '/api/workspaces/ws-1/projects/alpha/estimate'

function buildValue(
  overrides: Partial<EstimateValueDTO> = {},
): EstimateValueDTO {
  return {
    id: 'value-1',
    value: '1',
    order: 0,
    estimateSettingsId: 'settings-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildSettings(
  overrides: Partial<EstimateSettingsDTO> = {},
): EstimateSettingsDTO {
  return {
    id: 'settings-1',
    system: 'POINTS',
    model: 'FIBONACCI',
    projectId: 'project-1',
    values: [buildValue(), buildValue({ id: 'value-2', value: '2', order: 1 })],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useEstimateSettings', () => {
  it('fetches the estimate settings of the project', async () => {
    const settings = buildSettings()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(settings))

    const { result } = renderHookWithProviders(() =>
      useEstimateSettings('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(settings)
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
      useEstimateSettings(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Estimativas desativadas'))

    const { result } = renderHookWithProviders(() =>
      useEstimateSettings('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Estimativas desativadas')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useEstimateSettings('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar configurações de estimativa',
    )
  })
})

describe('useUpdateEstimateSettings', () => {
  it('PATCHes system and model and invalidates only this project settings', async () => {
    const input = {
      system: 'CATEGORIES' as const,
      model: 'T_SHIRT_SIZES' as const,
    }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildSettings(input)),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateEstimateSettings('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())
    queryClient.setQueryData(estimateKey('ws-1', 'beta'), buildSettings())

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'PATCH',
      body: input,
    })
    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(estimateKey('ws-1', 'beta'))?.isInvalidated,
    ).toBe(false)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateEstimateSettings('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())

    await act(async () => {
      await expect(
        result.current.mutateAsync({ system: 'TIME', model: 'HOURS' }),
      ).rejects.toThrow('Erro ao atualizar configurações de estimativa')
    })

    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(false)
  })
})

describe('useCreateEstimateValue', () => {
  it('POSTs the value and invalidates the settings', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildValue({ id: 'value-3', value: '3' }), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateEstimateValue('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())

    await act(() => result.current.mutateAsync({ value: '3' }))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/values`,
      method: 'POST',
      body: { value: '3' },
    })
    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(true)
  })

  it('surfaces the backend message when the create fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Valor duplicado'))
    const { result } = renderHookWithProviders(() =>
      useCreateEstimateValue('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync({ value: '1' })).rejects.toThrow(
        'Valor duplicado',
      )
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useCreateEstimateValue('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync({ value: '1' })).rejects.toThrow(
        'Erro ao criar valor de estimativa',
      )
    })
  })
})

describe('useUpdateEstimateValue', () => {
  it('PATCHes only the data payload to the value url and invalidates the settings', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildValue({ value: '5' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateEstimateValue('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())

    await act(() =>
      result.current.mutateAsync({ valueId: 'value-1', data: { value: '5' } }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/values/value-1`,
      method: 'PATCH',
      body: { value: '5' },
    })
    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateEstimateValue('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          valueId: 'value-1',
          data: { value: '5' },
        }),
      ).rejects.toThrow('Erro ao atualizar valor de estimativa')
    })
  })
})

describe('useDeleteEstimateValue', () => {
  it('DELETEs the value and invalidates the settings', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteEstimateValue('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())

    await act(() => result.current.mutateAsync('value-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/values/value-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteEstimateValue('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())

    await act(async () => {
      await expect(result.current.mutateAsync('value-1')).rejects.toThrow(
        'Erro ao excluir valor de estimativa',
      )
    })

    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(false)
  })
})

describe('useReorderEstimateValues', () => {
  it('PATCHes the ordered ids to /values/reorder and invalidates the settings', async () => {
    const reordered = [
      buildValue({ id: 'value-2', value: '2', order: 0 }),
      buildValue({ id: 'value-1', value: '1', order: 1 }),
    ]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(reordered))
    const { result, queryClient } = renderHookWithProviders(() =>
      useReorderEstimateValues('ws-1', 'alpha'),
    )
    queryClient.setQueryData(estimateKey(), buildSettings())

    let returned: EstimateValueDTO[] | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(['value-2', 'value-1'])
    })

    expect(returned).toEqual(reordered)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/values/reorder`,
      method: 'PATCH',
      body: { valueIds: ['value-2', 'value-1'] },
    })
    expect(queryClient.getQueryState(estimateKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useReorderEstimateValues('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync(['value-1'])).rejects.toThrow(
        'Erro ao reordenar valores de estimativa',
      )
    })
  })
})
