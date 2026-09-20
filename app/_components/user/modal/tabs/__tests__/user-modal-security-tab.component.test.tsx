import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import {
  deferredResponse,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { CookieConsentProvider } from '../../../cookie-consent/provider'
import { UserModalSecurityTab } from '../user-modal-security-tab'

const { useSession, listAccounts, requestPasswordReset } = vi.hoisted(() => ({
  useSession: vi.fn(),
  listAccounts: vi.fn(),
  requestPasswordReset: vi.fn(),
}))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession, listAccounts, requestPasswordReset },
}))

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

type Provider = 'credential' | 'google'

function mockSession(
  twoFactorEnabled: boolean,
  { isPending = false }: { isPending?: boolean } = {},
) {
  useSession.mockReturnValue({
    data: {
      user: { id: 'user-1', email: 'ana@nexo.dev', twoFactorEnabled },
    },
    isPending,
  })
}

function renderTab() {
  return renderWithProviders(
    <CookieConsentProvider initial={null} isAuthenticated>
      <Tabs value='security'>
        <UserModalSecurityTab tab='security' />
      </Tabs>
    </CookieConsentProvider>,
  )
}

function accounts(...providers: Provider[]) {
  return { data: providers.map((providerId) => ({ providerId })) }
}

beforeEach(() => {
  mockSession(false)
  listAccounts.mockResolvedValue(accounts('credential'))
  requestPasswordReset.mockResolvedValue({ error: null })
})

describe('<UserModalSecurityTab />', () => {
  it('gathers the password, two-factor and privacy sections under one heading', async () => {
    renderTab()

    expect(
      screen.getByRole('heading', { name: 'Segurança' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Redefinir senha' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: /Verificação em duas etapas/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Cookies de análise' }),
    ).toBeInTheDocument()
  })

  it('switches the password wording once it learns the account is social-only', async () => {
    listAccounts.mockResolvedValue(accounts('google'))
    renderTab()

    expect(
      await screen.findByRole('button', { name: 'Definir senha' }),
    ).toBeInTheDocument()
  })

  it('passes the session e-mail down to the password reset request', async () => {
    const { user } = renderTab()

    await user.click(
      await screen.findByRole('button', { name: 'Redefinir senha' }),
    )

    expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith({
      email: 'ana@nexo.dev',
      redirectTo: '/reset-password',
    })
  })

  it('reflects the session two-factor flag on the switch', async () => {
    mockSession(true)
    renderTab()

    expect(
      await screen.findByRole('switch', { name: /Verificação em duas etapas/ }),
    ).toBeChecked()
  })

  it('ignores an account list that resolves after the tab unmounts', async () => {
    const deferred = deferredResponse()
    listAccounts.mockReturnValue(deferred.promise)
    const { unmount } = renderTab()

    unmount()
    deferred.resolve(accounts('credential') as never)
    await deferred.promise

    // No "state update on an unmounted component" — the effect guards itself.
    expect(screen.queryByRole('button', { name: 'Redefinir senha' })).toBeNull()
  })
})
