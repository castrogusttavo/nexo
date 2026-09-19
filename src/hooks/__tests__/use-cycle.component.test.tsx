import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { CycleDTO, CycleMemberDTO } from '@/types/cycle'
import {
  useAddCycleMember,
  useCreateCycle,
  useCycle,
  useCycleMembers,
  useCycles,
  useDeleteCycle,
  useRemoveCycleMember,
  useUpdateCycle,
} from '../use-cycle'

const cyclesKey = (workspaceId = 'ws-1', projectSlug = 'alpha') =>
  [['cycles'], workspaceId, projectSlug] as const
const cycleMembersKey = (cycleId = 'cycle-1') =>
  [...cyclesKey(), cycleId, 'members'] as const

const BASE_URL = '/api/workspaces/ws-1/projects/alpha/cycles'

function buildCycle(overrides: Partial<CycleDTO> = {}): CycleDTO {
  return {
    id: 'cycle-1',
    name: 'Sprint 1',
    description: null,
    status: 'NOT_STARTED',
    startDate: null,
    endDate: null,
    leadId: 'user-1',
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildCycleMember(
  overrides: Partial<CycleMemberDTO> = {},
): CycleMemberDTO {
  return {
    userId: 'user-1',
    name: 'Ada Lovelace',
    username: 'ada',
    image: null,
    isLead: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useCycles', () => {
  it('fetches the cycles of the project', async () => {
    const cycles = [buildCycle(), buildCycle({ id: 'cycle-2' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(cycles))

    const { result } = renderHookWithProviders(() => useCycles('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(cycles)
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
      useCycles(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Ciclos desativados'))

    const { result } = renderHookWithProviders(() => useCycles('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Ciclos desativados')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useCycles('ws-1', 'alpha'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar ciclos')
  })
})

describe('useCycle', () => {
  it('fetches a single cycle by id', async () => {
    const cycle = buildCycle()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(cycle))

    const { result } = renderHookWithProviders(() =>
      useCycle('ws-1', 'alpha', 'cycle-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(cycle)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/cycle-1`,
      method: 'GET',
    })
  })

  it.each([
    ['workspace id', '', 'alpha', 'cycle-1'],
    ['project slug', 'ws-1', '', 'cycle-1'],
    ['cycle id', 'ws-1', 'alpha', undefined],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug, cycleId) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useCycle(workspaceId, projectSlug, cycleId),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404))

    const { result } = renderHookWithProviders(() =>
      useCycle('ws-1', 'alpha', 'cycle-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar ciclo')
  })
})

describe('useCreateCycle', () => {
  it('POSTs the cycle and invalidates only this project cycles', async () => {
    const input = {
      name: 'Sprint 1',
      status: 'IN_PROGRESS' as const,
      startDate: '2026-01-01',
      endDate: '2026-01-14',
    }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildCycle(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateCycle('ws-1', 'alpha'),
    )
    queryClient.setQueryData(cyclesKey(), [])
    queryClient.setQueryData(cyclesKey('ws-1', 'beta'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(cyclesKey())?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(cyclesKey('ws-1', 'beta'))?.isInvalidated,
    ).toBe(false)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateCycle('ws-1', 'alpha'),
    )
    queryClient.setQueryData(cyclesKey(), [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Sprint 1' }),
      ).rejects.toThrow('Erro ao criar ciclo')
    })

    expect(queryClient.getQueryState(cyclesKey())?.isInvalidated).toBe(false)
  })
})

describe('useUpdateCycle', () => {
  it('PATCHes only the data payload (nulls included) and invalidates the cycles', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildCycle({ status: 'COMPLETED' })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateCycle('ws-1', 'alpha'),
    )
    queryClient.setQueryData(cyclesKey(), [buildCycle()])

    await act(() =>
      result.current.mutateAsync({
        cycleId: 'cycle-1',
        data: { status: 'COMPLETED', endDate: null, description: null },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/cycle-1`,
      method: 'PATCH',
      body: { status: 'COMPLETED', endDate: null, description: null },
    })
    expect(queryClient.getQueryState(cyclesKey())?.isInvalidated).toBe(true)
  })

  it('refetches an open cycle detail after the update', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildCycle()))
    const { result } = renderHookWithProviders(() => ({
      cycle: useCycle('ws-1', 'alpha', 'cycle-1'),
      update: useUpdateCycle('ws-1', 'alpha'),
    }))
    await waitFor(() => expect(result.current.cycle.isSuccess).toBe(true))
    const updated = buildCycle({ status: 'COMPLETED' })
    fetchSpy
      .mockResolvedValueOnce(apiSuccess(updated))
      .mockResolvedValueOnce(apiSuccess(updated))

    await act(() =>
      result.current.update.mutateAsync({
        cycleId: 'cycle-1',
        data: { status: 'COMPLETED' },
      }),
    )

    await waitFor(() =>
      expect(result.current.cycle.data?.status).toBe('COMPLETED'),
    )
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateCycle('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ cycleId: 'cycle-1', data: {} }),
      ).rejects.toThrow('Erro ao atualizar ciclo')
    })
  })

  it('surfaces the backend message when the update fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(422, 'Datas inválidas'))
    const { result } = renderHookWithProviders(() =>
      useUpdateCycle('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ cycleId: 'cycle-1', data: {} }),
      ).rejects.toThrow('Datas inválidas')
    })
  })
})

describe('useDeleteCycle', () => {
  it('invalidates an open cycle detail too', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildCycle()))
    const { result, queryClient } = renderHookWithProviders(() => ({
      cycle: useCycle('ws-1', 'alpha', 'cycle-1'),
      remove: useDeleteCycle('ws-1', 'alpha'),
    }))
    await waitFor(() => expect(result.current.cycle.isSuccess).toBe(true))
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(apiError(404, 'Ciclo não encontrado'))

    await act(() => result.current.remove.mutateAsync('cycle-1'))

    const detail = queryClient
      .getQueryCache()
      .findAll({ predicate: (q) => q.queryKey.includes('cycle-1') })
    expect(detail).not.toHaveLength(0)
    for (const query of detail) expect(query.state.isInvalidated).toBe(true)
  })

  it('DELETEs the cycle and invalidates the cycles', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteCycle('ws-1', 'alpha'),
    )
    queryClient.setQueryData(cyclesKey(), [buildCycle()])

    await act(() => result.current.mutateAsync('cycle-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/cycle-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(cyclesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useDeleteCycle('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('cycle-1')).rejects.toThrow(
        'Erro ao excluir ciclo',
      )
    })
  })
})

describe('useCycleMembers', () => {
  it('fetches the members of the cycle', async () => {
    const members = [buildCycleMember()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(members))

    const { result, queryClient } = renderHookWithProviders(() =>
      useCycleMembers('ws-1', 'alpha', 'cycle-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(members)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/cycle-1/members`,
      method: 'GET',
    })
    expect(queryClient.getQueryData(cycleMembersKey())).toEqual(members)
  })

  it.each([
    ['workspace id', '', 'alpha', 'cycle-1'],
    ['project slug', 'ws-1', '', 'cycle-1'],
    ['cycle id', 'ws-1', 'alpha', ''],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug, cycleId) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useCycleMembers(workspaceId, projectSlug, cycleId),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Ciclo não encontrado'))

    const { result } = renderHookWithProviders(() =>
      useCycleMembers('ws-1', 'alpha', 'cycle-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Ciclo não encontrado')
  })
})

describe('useAddCycleMember', () => {
  it('POSTs the user id and invalidates only that cycle members', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildCycleMember({ userId: 'user-2', isLead: false }), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useAddCycleMember('ws-1', 'alpha', 'cycle-1'),
    )
    queryClient.setQueryData(cyclesKey(), [buildCycle()])
    queryClient.setQueryData(cycleMembersKey(), [])
    queryClient.setQueryData(cycleMembersKey('cycle-2'), [])

    await act(() => result.current.mutateAsync('user-2'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/cycle-1/members`,
      method: 'POST',
      body: { userId: 'user-2' },
    })
    expect(queryClient.getQueryState(cycleMembersKey())?.isInvalidated).toBe(
      true,
    )
    expect(
      queryClient.getQueryState(cycleMembersKey('cycle-2'))?.isInvalidated,
    ).toBe(false)
    expect(queryClient.getQueryState(cyclesKey())?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useAddCycleMember('ws-1', 'alpha', 'cycle-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-2')).rejects.toThrow(
        'Erro ao adicionar membro ao ciclo',
      )
    })
  })
})

describe('useRemoveCycleMember', () => {
  it('DELETEs the member and invalidates that cycle members', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveCycleMember('ws-1', 'alpha', 'cycle-1'),
    )
    queryClient.setQueryData(cycleMembersKey(), [buildCycleMember()])

    await act(() => result.current.mutateAsync('user-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/cycle-1/members/user-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(cycleMembersKey())?.isInvalidated).toBe(
      true,
    )
  })

  it('surfaces the backend message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveCycleMember('ws-1', 'alpha', 'cycle-1'),
    )
    queryClient.setQueryData(cycleMembersKey(), [buildCycleMember()])

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Sem permissão',
      )
    })

    expect(queryClient.getQueryState(cycleMembersKey())?.isInvalidated).toBe(
      false,
    )
  })
})

describe('member fallback messages', () => {
  it('names the ciclo members in the fetch fallback', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useCycleMembers('ws-1', 'alpha', 'cycle-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar membros do ciclo',
    )
  })

  it('names the ciclo in the remove fallback', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useRemoveCycleMember('ws-1', 'alpha', 'cycle-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Erro ao remover membro do ciclo',
      )
    })
  })
})
