import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ModuleDTO, ModuleMemberDTO } from '@/types/module'
import {
  useAddModuleMember,
  useCreateModule,
  useDeleteModule,
  useFavoriteModule,
  useModuleMembers,
  useModules,
  useRemoveModuleMember,
  useUnfavoriteModule,
  useUpdateModule,
} from '../use-module'

const modulesKey = (workspaceId = 'ws-1', projectSlug = 'alpha') =>
  [['modules'], workspaceId, projectSlug] as const
const moduleMembersKey = (moduleId = 'module-1') =>
  [...modulesKey(), moduleId] as const

const BASE_URL = '/api/workspaces/ws-1/projects/alpha/modules'

function buildModule(overrides: Partial<ModuleDTO> = {}): ModuleDTO {
  return {
    id: 'module-1',
    name: 'Billing',
    progress: 0,
    status: 'BACKLOG',
    startDate: null,
    endDate: null,
    isFavorited: false,
    leadId: 'user-1',
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildModuleMember(
  overrides: Partial<ModuleMemberDTO> = {},
): ModuleMemberDTO {
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

describe('useModules', () => {
  it('fetches the modules of the project', async () => {
    const modules = [buildModule(), buildModule({ id: 'module-2' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(modules))

    const { result } = renderHookWithProviders(() =>
      useModules('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(modules)
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
      useModules(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Módulos desativados'))

    const { result } = renderHookWithProviders(() =>
      useModules('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Módulos desativados')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useModules('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar módulos')
  })
})

describe('useCreateModule', () => {
  it('POSTs the module and invalidates only this project modules', async () => {
    const input = { name: 'Billing', status: 'PLANNED' as const }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildModule(input), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateModule('ws-1', 'alpha'),
    )
    queryClient.setQueryData(modulesKey(), [])
    queryClient.setQueryData(modulesKey('ws-1', 'beta'), [])

    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: BASE_URL,
      method: 'POST',
      body: input,
    })
    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(modulesKey('ws-1', 'beta'))?.isInvalidated,
    ).toBe(false)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateModule('ws-1', 'alpha'),
    )
    queryClient.setQueryData(modulesKey(), [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Billing' }),
      ).rejects.toThrow('Erro ao criar módulo')
    })

    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(false)
  })
})

describe('useUpdateModule', () => {
  it('PATCHes only the data payload to the module url and invalidates the modules', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildModule({ progress: 50 })),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateModule('ws-1', 'alpha'),
    )
    queryClient.setQueryData(modulesKey(), [buildModule()])

    await act(() =>
      result.current.mutateAsync({
        moduleId: 'module-1',
        data: { progress: 50, startDate: null },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/module-1`,
      method: 'PATCH',
      body: { progress: 50, startDate: null },
    })
    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateModule('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ moduleId: 'module-1', data: {} }),
      ).rejects.toThrow('Erro ao atualizar módulo')
    })
  })
})

describe('useDeleteModule', () => {
  it('DELETEs the module and invalidates the modules', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteModule('ws-1', 'alpha'),
    )
    queryClient.setQueryData(modulesKey(), [buildModule()])

    await act(() => result.current.mutateAsync('module-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/module-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useDeleteModule('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('module-1')).rejects.toThrow(
        'Erro ao deletar módulo',
      )
    })
  })
})

describe('useModuleMembers', () => {
  it('fetches the members of the module', async () => {
    const members = [buildModuleMember()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(members))

    const { result, queryClient } = renderHookWithProviders(() =>
      useModuleMembers('ws-1', 'alpha', 'module-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(members)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/module-1/members`,
      method: 'GET',
    })
    expect(queryClient.getQueryData(moduleMembersKey())).toEqual(members)
  })

  it.each([
    ['workspace id', '', 'alpha', 'module-1'],
    ['project slug', 'ws-1', '', 'module-1'],
    ['module id', 'ws-1', 'alpha', ''],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug, moduleId) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useModuleMembers(workspaceId, projectSlug, moduleId),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Módulo não encontrado'))

    const { result } = renderHookWithProviders(() =>
      useModuleMembers('ws-1', 'alpha', 'module-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Módulo não encontrado')
  })
})

describe('useAddModuleMember', () => {
  it('POSTs the user id and invalidates only that module members', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildModuleMember({ userId: 'user-2', isLead: false }), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useAddModuleMember('ws-1', 'alpha', 'module-1'),
    )
    queryClient.setQueryData(modulesKey(), [buildModule()])
    queryClient.setQueryData(moduleMembersKey(), [])
    queryClient.setQueryData(moduleMembersKey('module-2'), [])

    await act(() => result.current.mutateAsync('user-2'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/module-1/members`,
      method: 'POST',
      body: { userId: 'user-2' },
    })
    expect(queryClient.getQueryState(moduleMembersKey())?.isInvalidated).toBe(
      true,
    )
    expect(
      queryClient.getQueryState(moduleMembersKey('module-2'))?.isInvalidated,
    ).toBe(false)
    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useAddModuleMember('ws-1', 'alpha', 'module-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-2')).rejects.toThrow(
        'Erro ao adicionar membro ao módulo',
      )
    })
  })
})

describe('useRemoveModuleMember', () => {
  it('DELETEs the member and invalidates that module members', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveModuleMember('ws-1', 'alpha', 'module-1'),
    )
    queryClient.setQueryData(moduleMembersKey(), [buildModuleMember()])

    await act(() => result.current.mutateAsync('user-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}/module-1/members/user-1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(moduleMembersKey())?.isInvalidated).toBe(
      true,
    )
  })

  it('surfaces the backend message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveModuleMember('ws-1', 'alpha', 'module-1'),
    )
    queryClient.setQueryData(moduleMembersKey(), [buildModuleMember()])

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Sem permissão',
      )
    })

    expect(queryClient.getQueryState(moduleMembersKey())?.isInvalidated).toBe(
      false,
    )
  })
})

describe.each([
  {
    name: 'useFavoriteModule',
    useHook: useFavoriteModule,
    method: 'POST',
    favorited: true,
    fallback: 'Erro ao favoritar módulo',
  },
  {
    name: 'useUnfavoriteModule',
    useHook: useUnfavoriteModule,
    method: 'DELETE',
    favorited: false,
    fallback: 'Erro ao desfavoritar módulo',
  },
] as const)('$name', ({ useHook, method, favorited, fallback }) => {
  it(`${method}s the favorite endpoint without a body and invalidates the modules`, async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ favorited }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook('ws-1', 'alpha'),
    )
    queryClient.setQueryData(modulesKey(), [buildModule()])

    let returned: { favorited: boolean } | undefined
    await act(async () => {
      returned = await result.current.mutateAsync('module-1')
    })

    expect(returned).toEqual({ favorited })
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/module-1/favorite`,
      method,
      body: undefined,
    })
    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useHook('ws-1', 'alpha'),
    )
    queryClient.setQueryData(modulesKey(), [buildModule()])

    await act(async () => {
      await expect(result.current.mutateAsync('module-1')).rejects.toThrow(
        fallback,
      )
    })

    expect(queryClient.getQueryState(modulesKey())?.isInvalidated).toBe(false)
  })
})

describe('member fallback messages', () => {
  it('names the módulo members in the fetch fallback', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useModuleMembers('ws-1', 'alpha', 'module-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar membros do módulo',
    )
  })

  it('names the módulo in the remove fallback', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useRemoveModuleMember('ws-1', 'alpha', 'module-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Erro ao remover membro do módulo',
      )
    })
  })
})
