import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectMemberDTO } from '@/types/project'
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
} from '../use-project-member'

const membersKey = (workspaceId = 'ws-1', projectSlug = 'alpha') => [
  ['project-members'],
  workspaceId,
  projectSlug,
]

function buildMember(
  overrides: Partial<ProjectMemberDTO> = {},
): ProjectMemberDTO {
  return {
    userId: 'user-1',
    name: 'Ada Lovelace',
    username: 'ada',
    image: null,
    email: 'ada@example.com',
    isLead: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useProjectMembers', () => {
  it('fetches the members of the project', async () => {
    const members = [buildMember(), buildMember({ userId: 'user-2' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(members))

    const { result } = renderHookWithProviders(() =>
      useProjectMembers('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(members)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/alpha/members',
      method: 'GET',
    })
  })

  it.each([
    ['workspace id', '', 'alpha'],
    ['project slug', 'ws-1', ''],
  ])('does not fetch without a %s', (_, workspaceId, projectSlug) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useProjectMembers(workspaceId, projectSlug),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso ao projeto'))

    const { result } = renderHookWithProviders(() =>
      useProjectMembers('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso ao projeto')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useProjectMembers('ws-1', 'alpha'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(
      'Erro ao buscar membros do projeto',
    )
  })
})

describe('useAddProjectMember', () => {
  it('POSTs the user id and invalidates only this project members', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildMember({ userId: 'user-2' }), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useAddProjectMember('ws-1', 'alpha'),
    )
    queryClient.setQueryData(membersKey(), [buildMember()])
    queryClient.setQueryData(membersKey('ws-1', 'beta'), [])

    await act(() => result.current.mutateAsync('user-2'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1/projects/alpha/members',
      method: 'POST',
      body: { userId: 'user-2' },
    })
    expect(queryClient.getQueryState(membersKey())?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(membersKey('ws-1', 'beta'))?.isInvalidated,
    ).toBe(false)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useAddProjectMember('ws-1', 'alpha'),
    )
    queryClient.setQueryData(membersKey(), [])

    await act(async () => {
      await expect(result.current.mutateAsync('user-2')).rejects.toThrow(
        'Erro ao adicionar membro',
      )
    })

    expect(queryClient.getQueryState(membersKey())?.isInvalidated).toBe(false)
  })
})

describe('useRemoveProjectMember', () => {
  it('DELETEs the member and invalidates the project members', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveProjectMember('ws-1', 'alpha'),
    )
    queryClient.setQueryData(membersKey(), [buildMember()])

    await act(() => result.current.mutateAsync('user-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/projects/alpha/members/user-1',
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(membersKey())?.isInvalidated).toBe(true)
  })

  it('surfaces the backend message when the removal fails', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(422, 'Não é possível remover o lead'),
    )
    const { result } = renderHookWithProviders(() =>
      useRemoveProjectMember('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Não é possível remover o lead',
      )
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useRemoveProjectMember('ws-1', 'alpha'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('user-1')).rejects.toThrow(
        'Erro ao remover membro',
      )
    })
  })
})
