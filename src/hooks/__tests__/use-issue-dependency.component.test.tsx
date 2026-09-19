import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDependencyDTO } from '@/types/issue'
import {
  useCreateIssueDependency,
  useIssueDependencies,
  useRemoveIssueDependency,
} from '../use-issue-dependency'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const DEPENDENCIES_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}/dependencies`
const BASE_KEY = [['issue-dependencies'], WORKSPACE_ID, PROJECT_SLUG]
const SOURCE_KEY = [...BASE_KEY, ISSUE_ID]
// The other end of a dependency lives in another issue of the same project.
const TARGET_KEY = [...BASE_KEY, 'issue-2']
const OTHER_PROJECT_KEY = [
  ['issue-dependencies'],
  WORKSPACE_ID,
  'other',
  'issue-3',
]

function buildDependency(
  overrides: Partial<IssueDependencyDTO> = {},
): IssueDependencyDTO {
  return {
    id: 'dependency-1',
    sourceId: ISSUE_ID,
    targetId: 'issue-2',
    type: 'BLOCKS',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMutation<T>(hook: () => T) {
  const rendered = renderHookWithProviders(hook)
  rendered.queryClient.setQueryData(SOURCE_KEY, [buildDependency()])
  rendered.queryClient.setQueryData(TARGET_KEY, [buildDependency()])
  rendered.queryClient.setQueryData(OTHER_PROJECT_KEY, [])
  return rendered
}

function isInvalidated(
  queryClient: ReturnType<typeof renderHookWithProviders>['queryClient'],
  key: readonly unknown[],
) {
  return queryClient.getQueryState(key)?.isInvalidated
}

describe('useIssueDependencies', () => {
  it('fetches the dependencies of the issue', async () => {
    const dependencies = [buildDependency()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(dependencies))

    const { result } = renderHookWithProviders(() =>
      useIssueDependencies(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(dependencies)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: DEPENDENCIES_URL,
      method: 'GET',
    })
  })

  it('does not fetch without an issue id', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useIssueDependencies(WORKSPACE_ID, PROJECT_SLUG, ''),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useIssueDependencies(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar dependências')
  })
})

describe('useCreateIssueDependency', () => {
  it('POSTs the dependency and invalidates both ends within the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildDependency(), 201),
    )
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueDependency(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() =>
      result.current.mutateAsync({ targetId: 'issue-2', type: 'BLOCKS' }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: DEPENDENCIES_URL,
      method: 'POST',
      body: { targetId: 'issue-2', type: 'BLOCKS' },
    })
    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(true)
    expect(isInvalidated(queryClient, TARGET_KEY)).toBe(true)
    expect(isInvalidated(queryClient, OTHER_PROJECT_KEY)).toBe(false)
  })

  it('surfaces the backend message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(422, 'Dependência circular detectada'),
    )
    const { result, queryClient } = renderMutation(() =>
      useCreateIssueDependency(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ targetId: 'issue-2', type: 'BLOCKS' }),
      ).rejects.toThrow('Dependência circular detectada')
    })

    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderMutation(() =>
      useCreateIssueDependency(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          targetId: 'issue-2',
          type: 'STARTS_BEFORE',
        }),
      ).rejects.toThrow('Erro ao criar dependência')
    })
  })
})

describe('useRemoveIssueDependency', () => {
  it('DELETEs the dependency and invalidates both ends within the project', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderMutation(() =>
      useRemoveIssueDependency(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(() => result.current.mutateAsync('dependency-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${DEPENDENCIES_URL}/dependency-1`,
      method: 'DELETE',
    })
    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(true)
    expect(isInvalidated(queryClient, TARGET_KEY)).toBe(true)
    expect(isInvalidated(queryClient, OTHER_PROJECT_KEY)).toBe(false)
  })

  it('rejects with the fallback message and keeps the cache valid', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderMutation(() =>
      useRemoveIssueDependency(WORKSPACE_ID, PROJECT_SLUG, ISSUE_ID),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('dependency-1')).rejects.toThrow(
        'Erro ao remover dependência',
      )
    })

    expect(isInvalidated(queryClient, SOURCE_KEY)).toBe(false)
  })
})
