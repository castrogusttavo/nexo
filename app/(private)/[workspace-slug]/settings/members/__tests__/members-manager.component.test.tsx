import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ListMembersResult, MemberDTO } from '@/types/member'
import { MembersManager } from '../members-manager'

vi.mock('sonner', () => ({
  toast: {
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

function buildMember(overrides: Partial<MemberDTO> = {}): MemberDTO {
  return {
    membershipId: 'm-1',
    userId: 'user-1',
    name: 'Ana Souza',
    username: 'ana',
    email: 'ana@nexo.dev',
    image: null,
    role: 'OWNER',
    accountStatus: 'ACTIVE',
    authMethods: ['EMAIL_PASSWORD'],
    twoFactorEnabled: true,
    joinedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  }
}

const MEMBERS: MemberDTO[] = [
  buildMember(),
  buildMember({
    membershipId: 'm-2',
    userId: 'user-2',
    name: 'Bruno Lima',
    username: 'bruno',
    email: 'bruno@nexo.dev',
    role: 'VIEWER',
    accountStatus: 'PENDING_DELETION',
    authMethods: ['GOOGLE', 'GITHUB'],
    twoFactorEnabled: false,
  }),
]

type FetchSpy = ReturnType<typeof mockFetch>

/** Members come from `result`; the invitations list stays empty. */
function mockMembersApi(result: Partial<ListMembersResult> = {}) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (input) => {
    if (String(input).includes('/invitations')) return apiSuccess([])
    return apiSuccess({
      members: MEMBERS,
      total: MEMBERS.length,
      page: 1,
      pageSize: 20,
      ...result,
    })
  })
  return fetchSpy
}

/** Query string of the most recent members request. */
function lastMembersQuery(fetchSpy: FetchSpy) {
  const url = fetchSpy.mock.calls
    .map(([input]) => String(input))
    .filter((candidate) => candidate.includes('/members?'))
    .at(-1)
  if (!url) throw new Error('No members request was made')
  return url.slice(url.indexOf('?') + 1)
}

function renderManager(fetchSpy = mockMembersApi()) {
  const utils = renderWithProviders(<MembersManager workspaceId='ws-1' />)
  return { ...utils, fetchSpy }
}

const DEFAULT_QUERY = 'sortBy=joinedAt&sortOrder=desc&page=1&pageSize=20'

describe('<MembersManager /> listing', () => {
  it('shows the loading row before the first page arrives', () => {
    mockMembersApi()
    renderWithProviders(<MembersManager workspaceId='ws-1' />)

    expect(screen.getByText('Carregando membros...')).toBeInTheDocument()
  })

  it('requests the newest members first', async () => {
    const { fetchSpy } = renderManager()

    await waitFor(() => expect(lastMembersQuery(fetchSpy)).toBe(DEFAULT_QUERY))
  })

  it('renders every member column', async () => {
    renderManager()

    const row = (await screen.findByText('Ana Souza')).closest('tr')
    if (!row) throw new Error('No row for Ana Souza')
    expect(within(row).getByText('@ana')).toBeInTheDocument()
    expect(within(row).getByText('ana@nexo.dev')).toBeInTheDocument()
    expect(within(row).getByText('Dono')).toBeInTheDocument()
    expect(within(row).getByText('Ativo')).toBeInTheDocument()
    expect(within(row).getByText('E-mail e senha')).toBeInTheDocument()
    expect(within(row).getByText('2FA')).toBeInTheDocument()
    expect(
      within(row).getByText(
        new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date('2026-01-15T12:00:00.000Z')),
      ),
    ).toBeInTheDocument()
    // The avatar falls back to the initials when there is no image.
    expect(within(row).getByText('AN')).toBeInTheDocument()
  })

  it('renders the second member with its own labels', async () => {
    renderManager()

    const row = (await screen.findByText('Bruno Lima')).closest('tr')
    if (!row) throw new Error('No row for Bruno Lima')
    expect(within(row).getByText('Visualizador')).toBeInTheDocument()
    expect(within(row).getByText('Exclusão agendada')).toBeInTheDocument()
    expect(within(row).getByText('Google')).toBeInTheDocument()
    expect(within(row).getByText('GitHub')).toBeInTheDocument()
    expect(within(row).queryByText('2FA')).not.toBeInTheDocument()
  })

  it('reports the result count and the page footer', async () => {
    renderManager()

    expect(await screen.findByText('Página 1 de 1 · 2 membros')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })

  it('shows the empty message when nobody matches', async () => {
    renderManager(mockMembersApi({ members: [], total: 0 }))

    expect(
      await screen.findByText('Nenhum membro encontrado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nenhum membro')).toBeInTheDocument()
  })
})

describe('<MembersManager /> querying', () => {
  it('debounces the search and asks the API for it', async () => {
    const { user, fetchSpy } = renderManager()
    await screen.findByText('Ana Souza')

    await user.type(screen.getByPlaceholderText('Pesquisa...'), 'bru')

    await waitFor(
      () =>
        expect(lastMembersQuery(fetchSpy)).toBe(`search=bru&${DEFAULT_QUERY}`),
      { timeout: 3000 },
    )
  })

  it('walks to the next page and back to the first one on a new search', async () => {
    const { user, fetchSpy } = renderManager(
      mockMembersApi({ total: 42, pageSize: 20 }),
    )
    await screen.findByText('Ana Souza')

    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    await waitFor(() =>
      expect(lastMembersQuery(fetchSpy)).toBe(
        'sortBy=joinedAt&sortOrder=desc&page=2&pageSize=20',
      ),
    )
    expect(screen.getByText('Página 2 de 3 · 42 membros')).toBeVisible()

    await user.type(screen.getByPlaceholderText('Pesquisa...'), 'ana')

    await waitFor(
      () =>
        expect(lastMembersQuery(fetchSpy)).toBe(`search=ana&${DEFAULT_QUERY}`),
      { timeout: 3000 },
    )
  })

  it('sorts by another column from its header menu', async () => {
    const { user, fetchSpy } = renderManager()
    await screen.findByText('Ana Souza')

    await user.click(screen.getByRole('button', { name: /Nome completo/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'A-Z' }))

    await waitFor(() =>
      expect(lastMembersQuery(fetchSpy)).toBe(
        'sortBy=name&sortOrder=asc&page=1&pageSize=20',
      ),
    )
  })

  it('filters by role', async () => {
    const { user, fetchSpy } = renderManager()
    await screen.findByText('Ana Souza')

    await user.click(screen.getByRole('button', { name: /Cargos/ }))
    await user.click(await screen.findByRole('option', { name: 'Dono' }))

    await waitFor(() =>
      expect(lastMembersQuery(fetchSpy)).toBe(`roles=OWNER&${DEFAULT_QUERY}`),
    )
  })
})
