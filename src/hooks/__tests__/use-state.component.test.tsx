import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { StateDTO } from '@/types/state'
import {
  useCreateState,
  useDeleteState,
  useSetDefaultState,
  useStates,
  useUpdateState,
} from '../use-state'

const statesKey = (workspaceId = 'ws-1', projectSlug = 'alpha') =>
  [['states'], workspaceId, projectSlug] as const

const BASE_URL = '/api/workspaces/ws-1/projects/alpha/states'

function buildState(overrides: Partial<StateDTO> = {}): StateDTO {
  return {
    id: 'state-1',
    name: 'Todo',
    description: null,
    group: 'UNSTARTED',
    color: 'ZINC',
    order: 0,
    isDefault: false,
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useStates', () => {
  it('fetches the states of the project', async () => {
    const states = [buildState(), buildState({ id: 'state-2', order: 1 })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(states))

    const { result } = renderHookWithProviders(() => useStates('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(states)
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
      useStates(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Projeto não encontrado'))

    const { result } = renderHookWithProviders(() => useStates('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Projeto não encontrado')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useStates('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar states')
  })
})

describe('useCreateState', () => {
  it('POSTs the state and invalidates only this project states', async () => {
    const input = {
      name: 'Doing',
      group: 'STARTED' as const,
      color: 'BLUE' as const,
    }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildState(input), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateState('ws-1', 'alpha'),
    )
    queryClient.setQueryData(statesKey(), [])
    queryClient.setQueryData(statesKey('ws-1', 'beta'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(statesKey('ws-1', 'beta'))?.isInvalidated,
    ).toBe(false)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateState('ws-1', 'alpha'),
    )
    queryClient.setQueryData(statesKey(), [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Doing', group: 'STARTED' }),
      ).rejects.toThrow('Erro ao criar state')
    })

    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(false)
  })
})

describe('useUpdateState', () => {
  it('PATCHes only the data payload to the state url and invalidates the states', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildState({ name: 'Renamed', order: 3 })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateState('ws-1', 'alpha'),
    )
    queryClient.setQueryData(statesKey(), [buildState()])

    await act(() =>
      result.current.mutateAsync({
        stateId: 'state-1',
        data: { name: 'Renamed', order: 3 },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/state-1`,
      method: 'PATCH',
      body: { name: 'Renamed', order: 3 },
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateState('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ stateId: 'state-1', data: {} }),
      ).rejects.toThrow('Erro ao atualizar state')
    })
  })
})

describe('useDeleteState', () => {
  it('DELETEs the state and invalidates the states', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteState('ws-1', 'alpha'),
    )
    queryClient.setQueryData(statesKey(), [buildState()])

    await act(() => result.current.mutateAsync('state-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/state-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
  })

  it('surfaces the backend message when the delete is refused', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Não é possível excluir o state padrão'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteState('ws-1', 'alpha'),
    )
    queryClient.setQueryData(statesKey(), [buildState()])

    await act(async () => {
      await expect(result.current.mutateAsync('state-1')).rejects.toThrow(
        'Não é possível excluir o state padrão',
      )
    })

    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useDeleteState('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('state-1')).rejects.toThrow(
        'Erro ao excluir state',
      )
    })
  })
})

describe('useSetDefaultState', () => {
  it('PATCHes the /default endpoint without a body and invalidates the states', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildState({ isDefault: true })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useSetDefaultState('ws-1', 'alpha'),
    )
    queryClient.setQueryData(statesKey(), [buildState()])

    let returned: StateDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync('state-1')
    })

    expect(returned?.isDefault).toBe(true)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/state-1/default`,
      method: 'PATCH',
      body: undefined,
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useSetDefaultState('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('state-1')).rejects.toThrow(
        'Erro ao definir state padrão',
      )
    })
  })
})
