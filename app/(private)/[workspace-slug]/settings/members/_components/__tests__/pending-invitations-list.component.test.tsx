import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { InvitationDTO } from '@/types/invitation'
import { PendingInvitationsList } from '../pending-invitations-list'

vi.mock('sonner', () => ({
  toast: {
    // sonner subscribes to the promise it is handed; mirroring that keeps a
    // rejection the toast reports from surfacing as an unhandled rejection.
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

type ToastMessages = {
  loading: string
  success: string
  error: (err: unknown) => string
}

async function lastToastOutcome() {
  const call = vi.mocked(toast.promise).mock.calls.at(-1)
  if (!call) throw new Error('toast.promise was not called')
  const [promise, messages] = call as unknown as [
    Promise<unknown>,
    ToastMessages,
  ]
  try {
    await promise
    return { type: 'success', message: messages.success }
  } catch (err) {
    return { type: 'error', message: messages.error(err) }
  }
}

const BASE = '/api/workspaces/ws-1/invitations'

function buildInvitation(
  overrides: Partial<InvitationDTO> = {},
): InvitationDTO {
  return {
    id: 'inv-1',
    email: 'ana@nexo.dev',
    role: 'MEMBER',
    status: 'PENDING',
    expiresAt: '2026-06-01T00:00:00.000Z',
    workspaceId: 'ws-1',
    projectId: null,
    invitedById: 'user-1',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

const INVITATIONS = [
  buildInvitation(),
  buildInvitation({ id: 'inv-2', email: 'bruno@nexo.dev', role: 'ADMIN' }),
  buildInvitation({
    id: 'inv-3',
    email: 'carla@nexo.dev',
    status: 'ACCEPTED',
  }),
]

type FetchSpy = ReturnType<typeof mockFetch>

/** GETs return the invitation list; everything else gets `mutationResponse`. */
function mockInvitationsApi(
  mutationResponse?: () => Response | Promise<Response>,
  invitations: InvitationDTO[] = INVITATIONS,
) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (_input, init) => {
    if (!init?.method || init.method === 'GET') return apiSuccess(invitations)
    return mutationResponse ? mutationResponse() : apiSuccess(invitations[0])
  })
  return fetchSpy
}

function mutationCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

async function renderList(fetchSpy = mockInvitationsApi(), waitForRows = true) {
  const utils = renderWithProviders(
    <PendingInvitationsList workspaceId='ws-1' />,
  )
  if (waitForRows) await screen.findByText('ana@nexo.dev')
  return { ...utils, fetchSpy }
}

/** The row holding `email`, from which its role and delete buttons hang. */
function rowFor(email: string) {
  const row = screen
    .getByText(email)
    .closest('div.flex.items-center')?.parentElement
  if (!(row instanceof HTMLElement)) throw new Error(`No row for ${email}`)
  return row
}

describe('<PendingInvitationsList /> listing', () => {
  it('shows a skeleton before the invitations arrive', () => {
    mockInvitationsApi()
    renderWithProviders(<PendingInvitationsList workspaceId='ws-1' />)

    expect(screen.queryByText('Convites pendentes')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(2)
  })

  it('lists only the pending invitations with their role and status', async () => {
    const { fetchSpy } = await renderList()

    expect(screen.getByText('Convites pendentes')).toBeInTheDocument()
    expect(screen.getByText('bruno@nexo.dev')).toBeInTheDocument()
    expect(screen.queryByText('carla@nexo.dev')).not.toBeInTheDocument()
    expect(screen.getAllByText('Pendente')).toHaveLength(2)
    expect(
      within(rowFor('ana@nexo.dev')).getByRole('button', { name: /Membro/ }),
    ).toBeInTheDocument()
    expect(
      within(rowFor('bruno@nexo.dev')).getByRole('button', {
        name: /Administrador/,
      }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(BASE)
  })

  it('counts every invitation in the badge, pending or not', async () => {
    await renderList()

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders nothing when no invitation is pending', async () => {
    const fetchSpy = mockInvitationsApi(undefined, [
      buildInvitation({ status: 'REVOKED' }),
    ])
    const { container } = await renderList(fetchSpy, false)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('falls back to the raw role when it has no label', async () => {
    const fetchSpy = mockInvitationsApi(undefined, [
      buildInvitation({ role: 'OWNER' }),
    ])
    await renderList(fetchSpy)

    expect(screen.getByRole('button', { name: /OWNER/ })).toBeInTheDocument()
  })
})

describe('<PendingInvitationsList /> actions', () => {
  it('changes the role of an invitation', async () => {
    const fetchSpy = mockInvitationsApi()
    const { user } = await renderList(fetchSpy)

    await user.click(
      within(rowFor('ana@nexo.dev')).getByRole('button', { name: /Membro/ }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Visualizador' }),
    )

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: `${BASE}/inv-1`,
      method: 'PATCH',
      body: { role: 'VIEWER' },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Papel do convite atualizado',
    })
  })

  it('reports a failed role change', async () => {
    const fetchSpy = mockInvitationsApi(() => apiError(403, 'Sem permissão'))
    const { user } = await renderList(fetchSpy)

    await user.click(
      within(rowFor('ana@nexo.dev')).getByRole('button', { name: /Membro/ }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Administrador' }),
    )

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Sem permissão',
    })
  })

  it('revokes an invitation', async () => {
    const fetchSpy = mockInvitationsApi()
    const { user } = await renderList(fetchSpy)

    await user.click(
      within(rowFor('bruno@nexo.dev')).getByRole('button', { name: 'Excluir' }),
    )

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${BASE}/inv-2`,
      method: 'DELETE',
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Convite excluído',
    })
  })

  it('disables the delete buttons while a revocation is in flight', async () => {
    const fetchSpy = mockInvitationsApi(() => new Promise<Response>(() => {}))
    const { user } = await renderList(fetchSpy)

    await user.click(
      within(rowFor('ana@nexo.dev')).getByRole('button', { name: 'Excluir' }),
    )

    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: 'Excluir' })[0],
      ).toBeDisabled(),
    )
  })

  it('reports a failed revocation', async () => {
    const fetchSpy = mockInvitationsApi(() => apiError(403, 'Sem permissão'))
    const { user } = await renderList(fetchSpy)

    await user.click(
      within(rowFor('ana@nexo.dev')).getByRole('button', { name: 'Excluir' }),
    )

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Sem permissão',
    })
  })
})
