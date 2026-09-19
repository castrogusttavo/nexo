import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueTypeDTO } from '@/types/issue-type'
import {
  useCreateIssueType,
  useDeleteIssueType,
  useIssueTypes,
  useReorderIssueTypes,
  useUpdateIssueType,
} from '../use-issue-type'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const TYPES_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issue-types`
const TYPES_KEY = [['issue-types'], WORKSPACE_ID, PROJECT_SLUG]
const OTHER_PROJECT_KEY = [['issue-types'], WORKSPACE_ID, 'other']

function buildIssueType(overrides: Partial<IssueTypeDTO> = {}): IssueTypeDTO {
  return {
    id: 'type-1',
    name: 'Bug',
    description: null,
    color: 'RED',
    icon: 'bug',
    isSystem: false,
    order: 0,
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMutation<T>(hook: () => T) {
  const rendered = renderHookWithProviders(hook)
  rendered.queryClient.setQueryData(TYPES_KEY, [buildIssueType()])
  rendered.queryClient.setQueryData(OTHER_PROJECT_KEY, [])
  return rendered
}

function isInvalidated(
  queryClient: ReturnType<typeof renderHookWithProviders>['queryClient'],
  key: readonly unknown[],
) {
  return queryClient.getQueryState(key)?.isInvalidated
}

describe('useIssueTypes', () => {
  it('fetches the issue types of the project', async () => {
    const types = [
      buildIssueType(),
      buildIssueType({ id: 'type-2', name: 'Feature', order: 1 }),
    ]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(types))

    const { result } = renderHookWithProviders(() =>
      useIssueTypes(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(types)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: TYPES_URL,
      method: 'GET',
    })
  })

  it.each([
    ['workspace', '', PROJECT_SLUG],
    ['project', WORKSPACE_ID, ''],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueTypes(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Projeto não encontrado'))

    const { result } = renderHookWithProviders(() =>
      useIssueTypes(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Projeto não encontrado')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueTypes(WORKSPACE_ID, PROJECT_SLUG),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar tipos de issue')
  })
})

describe('useCreateIssueType', () => {
  it('POSTs the type and invalidates only this project types', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildIssueType({ id: 'type-2', name: 'Task' }), 201),
    )
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    const input = { name: 'Task', color: 'BLUE' as const, icon: 'check' }
    await act(() => result.current.mutateAsync(input))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: TYPES_URL,
      method: 'POST',
      body: input,
    })
    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(true)
    expect(isInvalidated(queryClient, OTHER_PROJECT_KEY)).toBe(false)
  })

  it('surfaces the backend message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Tipo já existe'))
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Bug', icon: 'bug' }),
      ).rejects.toThrow('Tipo já existe')
    })

    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useCreateIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: 'Bug', icon: 'bug' }),
      ).rejects.toThrow('Erro ao criar tipo de issue')
    })
  })
})

describe('useUpdateIssueType', () => {
  it('PATCHes the type by id and invalidates the project types', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildIssueType({ name: 'Defect' })),
    )
    const { result, queryClient } = renderMutation(() =>
      useUpdateIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(() =>
      result.current.mutateAsync({
        typeId: 'type-1',
        data: { name: 'Defect' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${TYPES_URL}/type-1`,
      method: 'PATCH',
      body: { name: 'Defect' },
    })
    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(true)
  })

  it('rejects with the fallback message when the update fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useUpdateIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ typeId: 'type-1', data: {} }),
      ).rejects.toThrow('Erro ao atualizar tipo de issue')
    })
  })
})

describe('useDeleteIssueType', () => {
  it('DELETEs the type and invalidates the project types', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useDeleteIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(() => result.current.mutateAsync('type-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${TYPES_URL}/type-1`,
      method: 'DELETE',
    })
    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(true)
  })

  it('surfaces the backend message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Tipos do sistema não podem ser excluídos'),
    )
    const { result, queryClient } = renderMutation(() =>
      useDeleteIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('type-1')).rejects.toThrow(
        'Tipos do sistema não podem ser excluídos',
      )
    })

    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useDeleteIssueType(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('type-1')).rejects.toThrow(
        'Erro ao excluir tipo de issue',
      )
    })
  })
})

describe('useReorderIssueTypes', () => {
  it('PATCHes the ordered ids to the reorder endpoint and invalidates', async () => {
    const reordered = [
      buildIssueType({ id: 'type-2', order: 0 }),
      buildIssueType({ id: 'type-1', order: 1 }),
    ]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(reordered))
    const { result, queryClient } = renderMutation(() =>
      useReorderIssueTypes(WORKSPACE_ID, PROJECT_SLUG),
    )

    let returned: IssueTypeDTO[] | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(['type-2', 'type-1'])
    })

    expect(returned).toEqual(reordered)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${TYPES_URL}/reorder`,
      method: 'PATCH',
      body: { typeIds: ['type-2', 'type-1'] },
    })
    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(true)
  })

  it('rejects with the fallback message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderMutation(() =>
      useReorderIssueTypes(WORKSPACE_ID, PROJECT_SLUG),
    )

    await act(async () => {
      await expect(result.current.mutateAsync(['type-1'])).rejects.toThrow(
        'Erro ao reordenar tipo de issue',
      )
    })

    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(false)
  })
})
