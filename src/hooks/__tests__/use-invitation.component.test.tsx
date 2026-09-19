import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { InvitationDTO } from '@/types/invitation'
import {
  useAcceptInvitation,
  useCreateInvitation,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateInvitationRole,
} from '../use-invitation'

const WS1_KEY = [['invitations'], 'ws-1']
const WS2_KEY = [['invitations'], 'ws-2']

function buildInvitation(
  overrides: Partial<InvitationDTO> = {},
): InvitationDTO {
  return {
    id: 'inv-1',
    email: 'bia@example.com',
    role: 'MEMBER',
    status: 'PENDING',
    expiresAt: '2026-01-08T00:00:00.000Z',
    workspaceId: 'ws-1',
    projectId: null,
    invitedById: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

type Client = ReturnType<typeof renderHookWithProviders>['queryClient']

function seedInvitationLists(queryClient: Client) {
  queryClient.setQueryData(WS1_KEY, [buildInvitation()])
  queryClient.setQueryData(WS2_KEY, [buildInvitation({ workspaceId: 'ws-2' })])
}

function expectOnlyWs1Invalidated(queryClient: Client) {
  expect(queryClient.getQueryState(WS1_KEY)?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(WS2_KEY)?.isInvalidated).toBe(false)
}

describe('useInvitations', () => {
  it('fetches the pending invitations of the workspace', async () => {
    const invitations = [buildInvitation()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(invitations))

    const { result } = renderHookWithProviders(() => useInvitations('ws-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(invitations)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/invitations',
      method: 'GET',
    })
  })

  it('does not fetch without a workspace', () => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() => useInvitations(null))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))

    const { result } = renderHookWithProviders(() => useInvitations('ws-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem permissão')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useInvitations('ws-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar convites')
  })
})

describe('useCreateInvitation', () => {
  it('POSTs the email and role and invalidates that workspace list', async () => {
    const invitation = buildInvitation()
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(invitation, 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateInvitation('ws-1'),
    )
    seedInvitationLists(queryClient)

    let created: InvitationDTO | undefined
    await act(async () => {
      created = await result.current.mutateAsync({
        email: 'bia@example.com',
        role: 'MEMBER',
      })
    })

    expect(created).toEqual(invitation)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1/invitations',
      method: 'POST',
      body: { email: 'bia@example.com', role: 'MEMBER' },
    })
    expectOnlyWs1Invalidated(queryClient)
  })

  it('keeps the list valid and surfaces the error when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Convite já enviado'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateInvitation('ws-1'),
    )
    seedInvitationLists(queryClient)

    await act(async () => {
      await expect(
        result.current.mutateAsync({ email: 'bia@example.com', role: 'ADMIN' }),
      ).rejects.toThrow('Convite já enviado')
    })

    expect(queryClient.getQueryState(WS1_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useCreateInvitation('ws-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ email: 'bia@example.com', role: 'ADMIN' }),
      ).rejects.toThrow('Erro ao enviar convite')
    })
  })
})

describe('useRevokeInvitation', () => {
  it('DELETEs the invitation and invalidates that workspace list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRevokeInvitation('ws-1'),
    )
    seedInvitationLists(queryClient)

    await act(() => result.current.mutateAsync('inv-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/invitations/inv-1',
      method: 'DELETE',
    })
    expectOnlyWs1Invalidated(queryClient)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRevokeInvitation('ws-1'),
    )
    seedInvitationLists(queryClient)

    await act(async () => {
      await expect(result.current.mutateAsync('inv-1')).rejects.toThrow(
        'Erro ao revogar convite',
      )
    })
    expect(queryClient.getQueryState(WS1_KEY)?.isInvalidated).toBe(false)
  })
})

describe('useResendInvitation', () => {
  it('POSTs to the resend endpoint and invalidates that workspace list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useResendInvitation('ws-1'),
    )
    seedInvitationLists(queryClient)

    await act(() => result.current.mutateAsync('inv-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/workspaces/ws-1/invitations/inv-1/resend',
      method: 'POST',
    })
    expectOnlyWs1Invalidated(queryClient)
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(429, 'Aguarde para reenviar'))
    const { result } = renderHookWithProviders(() =>
      useResendInvitation('ws-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('inv-1')).rejects.toThrow(
        'Aguarde para reenviar',
      )
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useResendInvitation('ws-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync('inv-1')).rejects.toThrow(
        'Erro ao reenviar convite',
      )
    })
  })
})

describe('useAcceptInvitation', () => {
  it('POSTs the token and returns the joined workspace', async () => {
    const joined = { workspaceId: 'ws-1', slug: 'acme' }
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(joined))
    const { result } = renderHookWithProviders(() => useAcceptInvitation())

    let returned: typeof joined | undefined
    await act(async () => {
      returned = await result.current.mutateAsync('token-123')
    })

    expect(returned).toEqual(joined)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/invitations/accept',
      method: 'POST',
      body: { token: 'token-123' },
    })
  })

  it('surfaces the backend message when the token is rejected', async () => {
    mockFetch().mockResolvedValueOnce(apiError(410, 'Convite expirado'))
    const { result } = renderHookWithProviders(() => useAcceptInvitation())

    await act(async () => {
      await expect(result.current.mutateAsync('token-123')).rejects.toThrow(
        'Convite expirado',
      )
    })
  })

  it('falls back to the accept message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useAcceptInvitation())

    await act(async () => {
      await expect(result.current.mutateAsync('token-1')).rejects.toThrow(
        'Erro ao aceitar convite',
      )
    })
  })
})

describe('useUpdateInvitationRole', () => {
  it('PATCHes only the role and invalidates that workspace list', async () => {
    const updated = buildInvitation({ role: 'ADMIN' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(updated))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateInvitationRole('ws-1'),
    )
    seedInvitationLists(queryClient)

    let returned: InvitationDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({
        invitationId: 'inv-1',
        role: 'ADMIN',
      })
    })

    expect(returned).toEqual(updated)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1/invitations/inv-1',
      method: 'PATCH',
      body: { role: 'ADMIN' },
    })
    expectOnlyWs1Invalidated(queryClient)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUpdateInvitationRole('ws-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ invitationId: 'inv-1', role: 'ADMIN' }),
      ).rejects.toThrow('Erro ao atualizar o papel do convite')
    })
  })
})
