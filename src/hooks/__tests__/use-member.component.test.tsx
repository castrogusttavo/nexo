import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ListMembersResult, MemberDTO } from '@/types/member'
import type { MemberImportResult } from '@/types/member-import'
import {
  type ListMembersParams,
  useImportMembers,
  useMembers,
} from '../use-member'

function buildMember(overrides: Partial<MemberDTO> = {}): MemberDTO {
  return {
    membershipId: 'membership-1',
    userId: 'user-1',
    name: 'Ana',
    username: 'ana',
    email: 'ana@example.com',
    image: null,
    role: 'MEMBER',
    accountStatus: 'ACTIVE',
    authMethods: ['EMAIL_PASSWORD'],
    twoFactorEnabled: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildList(
  overrides: Partial<ListMembersResult> = {},
): ListMembersResult {
  return {
    members: [buildMember()],
    total: 1,
    page: 1,
    pageSize: 20,
    ...overrides,
  }
}

function buildParams(
  overrides: Partial<ListMembersParams> = {},
): ListMembersParams {
  return {
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 20,
    ...overrides,
  }
}

function buildImportResult(): MemberImportResult {
  return {
    invited: 1,
    skipped: 1,
    errors: 0,
    rows: [
      { row: 1, email: 'bia@example.com', status: 'invited' },
      {
        row: 2,
        email: 'ana@example.com',
        status: 'skipped',
        reason: 'Já é membro',
      },
    ],
  }
}

function queryParams(url: string) {
  return Object.fromEntries(new URL(url, 'http://localhost').searchParams)
}

describe('useMembers', () => {
  it('fetches the members page with the sort and paging params', async () => {
    const list = buildList()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(list))

    const { result } = renderHookWithProviders(() =>
      useMembers('ws-1', buildParams()),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(list)
    const { url, method } = getFetchCall(fetchSpy)
    expect(method).toBe('GET')
    expect(url.startsWith('/api/workspaces/ws-1/members?')).toBe(true)
    // Empty filters are omitted from the query string.
    expect(queryParams(url)).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
      page: '1',
      pageSize: '20',
    })
  })

  it('sends the search term and joins the roles with commas', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildList()))

    const { result } = renderHookWithProviders(() =>
      useMembers(
        'ws-1',
        buildParams({
          search: 'ana silva',
          roles: ['ADMIN', 'OWNER'],
          sortBy: 'joinedAt',
          sortOrder: 'desc',
          page: 3,
          pageSize: 50,
        }),
      ),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryParams(getFetchCall(fetchSpy).url)).toEqual({
      search: 'ana silva',
      roles: 'ADMIN,OWNER',
      sortBy: 'joinedAt',
      sortOrder: 'desc',
      page: '3',
      pageSize: '50',
    })
  })

  it('omits the roles param when the roles list is empty', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildList()))

    const { result } = renderHookWithProviders(() =>
      useMembers('ws-1', buildParams({ roles: [], search: '' })),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const params = queryParams(getFetchCall(fetchSpy).url)
    expect(params).not.toHaveProperty('roles')
    expect(params).not.toHaveProperty('search')
  })

  it('does not fetch without a workspace', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useMembers(null, buildParams()),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps showing the previous page while the next one loads', async () => {
    const firstPage = buildList()
    let resolveSecond: (res: Response) => void = () => {}
    mockFetch()
      .mockResolvedValueOnce(apiSuccess(firstPage))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
      )
    let params = buildParams()

    const { result, rerender } = renderHookWithProviders(() =>
      useMembers('ws-1', params),
    )
    await waitFor(() => expect(result.current.data).toEqual(firstPage))

    params = buildParams({ page: 2 })
    rerender()

    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data).toEqual(firstPage)

    const secondPage = buildList({
      page: 2,
      members: [buildMember({ membershipId: 'membership-2' })],
    })
    resolveSecond(apiSuccess(secondPage))
    await waitFor(() => expect(result.current.data).toEqual(secondPage))
    expect(result.current.isPlaceholderData).toBe(false)
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))

    const { result } = renderHookWithProviders(() =>
      useMembers('ws-1', buildParams()),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem permissão')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useMembers('ws-1', buildParams()),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar membros')
  })
})

describe('useImportMembers', () => {
  it('POSTs the file as multipart form data', async () => {
    const summary = buildImportResult()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(summary))
    const { result } = renderHookWithProviders(() => useImportMembers('ws-1'))
    const file = new File(['email,role\nbia@example.com,MEMBER'], 'm.csv', {
      type: 'text/csv',
    })

    let returned: MemberImportResult | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(file)
    })

    expect(returned).toEqual(summary)
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/workspaces/ws-1/members/import')
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
  })

  it('invalidates the members and invitations of that workspace only', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildImportResult()))
    const { result, queryClient } = renderHookWithProviders(() =>
      useImportMembers('ws-1'),
    )
    const membersKey = [['members'], 'ws-1', buildParams()]
    const invitationsKey = [['invitations'], 'ws-1']
    const otherMembersKey = [['members'], 'ws-2', buildParams()]
    queryClient.setQueryData(membersKey, buildList())
    queryClient.setQueryData(invitationsKey, [])
    queryClient.setQueryData(otherMembersKey, buildList())

    await act(() => result.current.mutateAsync(new File(['x'], 'm.csv')))

    expect(queryClient.getQueryState(membersKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(invitationsKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherMembersKey)?.isInvalidated).toBe(
      false,
    )
  })

  it('does not invalidate anything when the import fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(422, 'CSV inválido'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useImportMembers('ws-1'),
    )
    const membersKey = [['members'], 'ws-1', buildParams()]
    queryClient.setQueryData(membersKey, buildList())

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'm.csv')),
      ).rejects.toThrow('CSV inválido')
    })

    expect(queryClient.getQueryState(membersKey)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useImportMembers('ws-1'))

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'm.csv')),
      ).rejects.toThrow('Erro ao importar membros')
    })
  })
})
