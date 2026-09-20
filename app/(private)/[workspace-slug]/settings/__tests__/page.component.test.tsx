import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CookieConsentProvider } from '@/app/_components/user/cookie-consent/provider'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import SettingsPage from '../page'

const { useSession, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    useSession,
    twoFactor: { enable: vi.fn(), disable: vi.fn() },
    signOut,
  },
}))

const SCHEDULED_AT = '2026-05-20T15:30:00.000Z'
const ACCEPTED_AT = '2026-02-10T12:00:00.000Z'

type Profile = {
  deletionScheduledAt: string | null
  acceptedTermsAt: string | null
  acceptedPrivacyAt: string | null
}

const EMPTY_PROFILE: Profile = {
  deletionScheduledAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
}

/** Routes the profile GET; the deletion DELETE always succeeds. */
function mockProfileApi(profile: Profile = EMPTY_PROFILE) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (input, init) => {
    if (!init?.method || init.method === 'GET') return apiSuccess(profile)
    if (String(input).endsWith('/deletion'))
      return new Response(null, { status: 204 })
    return new Response(null, { status: 204 })
  })
  return fetchSpy
}

function renderPage(fetchSpy = mockProfileApi()) {
  const utils = renderWithProviders(
    // The cookie-consent context comes from a layout above this page.
    <CookieConsentProvider initial={null} isAuthenticated>
      <SettingsPage />
    </CookieConsentProvider>,
  )
  return { ...utils, fetchSpy }
}

beforeEach(() => {
  useSession.mockReturnValue({
    data: { user: { id: 'user-1', twoFactorEnabled: false } },
    isPending: false,
  })
})

describe('<SettingsPage />', () => {
  it('stacks the three settings cards', async () => {
    const { fetchSpy } = renderPage()

    expect(
      screen.getByText('Verificação em duas etapas (2FA)'),
    ).toBeInTheDocument()
    expect(screen.getByText('Privacidade')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Excluir conta' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/users/me')
  })

  it('hydrates the cards from the profile response', async () => {
    renderPage(
      mockProfileApi({
        deletionScheduledAt: SCHEDULED_AT,
        acceptedTermsAt: ACCEPTED_AT,
        acceptedPrivacyAt: ACCEPTED_AT,
      }),
    )

    expect(await screen.findByText(/Exclusão agendada para/)).toHaveTextContent(
      new Date(SCHEDULED_AT).toLocaleString('pt-BR'),
    )
    const date = new Date(ACCEPTED_AT).toLocaleDateString('pt-BR')
    expect(screen.getByText(`Aceito em ${date}`)).toBeInTheDocument()
    expect(screen.getByText(`Aceita em ${date}`)).toBeInTheDocument()
  })

  it('returns the card to its idle state once the deletion is cancelled', async () => {
    const { user } = renderPage(
      mockProfileApi({ ...EMPTY_PROFILE, deletionScheduledAt: SCHEDULED_AT }),
    )

    await user.click(
      await screen.findByRole('button', { name: 'Cancelar exclusão' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Excluir conta' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Exclusão agendada para/)).not.toBeInTheDocument()
  })

  it('leaves the defaults in place when the profile request fails', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      new Response(null, { status: 500 }),
    )
    renderPage(fetchSpy)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(
      screen.getByRole('button', { name: 'Excluir conta' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pendente de aceite')).toHaveLength(2)
  })

  it('survives a network failure while loading the profile', async () => {
    const fetchSpy = mockFetch().mockRejectedValue(new Error('offline'))
    renderPage(fetchSpy)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(
      screen.getByRole('button', { name: 'Excluir conta' }),
    ).toBeInTheDocument()
  })
})
