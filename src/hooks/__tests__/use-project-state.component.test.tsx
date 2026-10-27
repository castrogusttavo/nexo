import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildProjectStateDTO } from '@/src/__tests__/factories/dto/project-state.dto'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  useCreateProjectState,
  useDeleteProjectState,
  useProjectStates,
  useSetDefaultProjectState,
  useUpdateProjectState,
} from '../use-project-state'

const statesKey = (workspaceId = 'ws-1') =>
  [['project-states'], workspaceId] as const
const projectsKey = (workspaceId = 'ws-1') =>
  [['projects'], workspaceId] as const

const BASE_URL = '/api/workspaces/ws-1/project-states'

describe('useProjectStates', () => {
  it('fetches the states of the workspace', async () => {
    const states = [
      buildProjectStateDTO(),
      buildProjectStateDTO({ id: 'pstate-2', group: 'PLANNING' }),
    ]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(states))

    const { result } = renderHookWithProviders(() => useProjectStates('ws-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(states)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it('does not fetch without a workspace id', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useProjectStates(''))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useProjectStates('ws-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar estados de projeto',
    )
  })
})

describe('useCreateProjectState', () => {
  it('POSTs the state and invalidates only this workspace states', async () => {
    const input = { name: 'Em revisão', group: 'MONITORING' as const }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProjectStateDTO(input), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProjectState('ws-1'),
    )
    queryClient.setQueryData(statesKey(), [])
    queryClient.setQueryData(statesKey('ws-2'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(statesKey('ws-2'))?.isInvalidated).toBe(
      false,
    )
  })

  it('surfaces a taken name and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Já existe um estado de projeto com esse nome'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateProjectState('ws-1'),
    )
    queryClient.setQueryData(statesKey(), [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Rascunho', group: 'DRAFT' }),
      ).rejects.toThrow('Já existe um estado de projeto com esse nome')
    })

    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(false)
  })
})

describe('useUpdateProjectState', () => {
  it('PATCHes only the data payload to the state url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProjectStateDTO({ name: 'Novo' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateProjectState('ws-1'),
    )
    queryClient.setQueryData(statesKey(), [buildProjectStateDTO()])

    await act(() =>
      result.current.mutateAsync({
        stateId: 'pstate-1',
        data: { name: 'Novo', color: 'BLUE' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/pstate-1`,
      method: 'PATCH',
      body: { name: 'Novo', color: 'BLUE' },
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateProjectState('ws-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          stateId: 'pstate-1',
          data: { name: 'X' },
        }),
      ).rejects.toThrow('Erro ao atualizar estado de projeto')
    })
  })
})

describe('useDeleteProjectState', () => {
  it('DELETEs the state, hands back where the projects went and invalidates states and projects', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ movedTo: 'pstate-9', count: 3 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteProjectState('ws-1'),
    )
    queryClient.setQueryData(statesKey(), [buildProjectStateDTO()])
    queryClient.setQueryData(projectsKey(), [])

    let moved: { movedTo: string; count: number } | undefined
    await act(async () => {
      moved = await result.current.mutateAsync('pstate-2')
    })

    expect(moved).toEqual({ movedTo: 'pstate-9', count: 3 })
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/pstate-2`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(projectsKey())?.isInvalidated).toBe(true)
  })

  it('surfaces the refusal and keeps both caches valid', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'O grupo precisa manter ao menos um estado'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteProjectState('ws-1'),
    )
    queryClient.setQueryData(statesKey(), [buildProjectStateDTO])
    queryClient.setQueryData(projectsKey(), [])

    await act(async () => {
      await expect(result.current.mutateAsync('pstate-2')).rejects.toThrow(
        'O grupo precisa manter ao menos um estado',
      )
    })

    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(projectsKey())?.isInvalidated).toBe(false)
  })
})

describe('useSetDefaultProjectState', () => {
  it('PATCHes the /default endpoint without a body and invalidates only the states', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProjectStateDTO({ id: 'pstate-2', isDefault: true })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useSetDefaultProjectState('ws-1'),
    )
    queryClient.setQueryData(statesKey(), [buildProjectStateDTO()])
    queryClient.setQueryData(projectsKey(), [])

    await act(() => result.current.mutateAsync('pstate-2'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/pstate-2/default`,
      method: 'PATCH',
      body: undefined,
    })
    expect(queryClient.getQueryState(statesKey())?.isInvalidated).toBe(true)
    // A new default only affects projects created from now on.

    expect(queryClient.getQueryState(projectsKey())?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useSetDefaultProjectState('ws-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('pstate-2')).rejects.toThrow(
        'Erro ao definir estado padrão',
      )
    })
  })
})
