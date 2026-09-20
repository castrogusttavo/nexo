import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { SettingsTwoFactorCard } from '../settings-two-factor-card'

const { useSession, enable, disable } = vi.hoisted(() => ({
  useSession: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession, twoFactor: { enable, disable } },
}))

function mockSession({
  twoFactorEnabled = false,
  isPending = false,
}: {
  twoFactorEnabled?: boolean
  isPending?: boolean
} = {}) {
  useSession.mockReturnValue({
    data: isPending ? null : { user: { id: 'user-1', twoFactorEnabled } },
    isPending,
  })
}

const toggle = () => screen.getByRole('switch')
const passwordInput = () => screen.getByPlaceholderText('••••••')

function renderCard() {
  return renderWithProviders(<SettingsTwoFactorCard />)
}

/** Turns the switch on and types `password` into the confirmation field. */
async function startEnabling(
  user: ReturnType<typeof renderWithProviders>['user'],
  password = 'senha-secreta',
) {
  await user.click(toggle())
  if (password) await user.type(passwordInput(), password)
}

beforeEach(() => {
  mockSession()
  enable.mockResolvedValue({
    data: { backupCodes: ['code-aaa', 'code-bbb'] },
    error: null,
  })
  disable.mockResolvedValue({ data: {}, error: null })
})

describe('<SettingsTwoFactorCard /> status', () => {
  it('reports 2FA as inactive when the session has it off', () => {
    renderCard()

    expect(screen.getByText('Inativa')).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
  })

  it('reports 2FA as active when the session has it on', () => {
    mockSession({ twoFactorEnabled: true })
    renderCard()

    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
  })

  it('locks the switch while the session is still loading', () => {
    mockSession({ isPending: true })
    renderCard()

    expect(toggle()).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('<SettingsTwoFactorCard /> enabling', () => {
  it('asks for the password before calling the API', async () => {
    const { user } = renderCard()

    await user.click(toggle())

    expect(screen.getByText('Senha para ativar a 2FA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeEnabled()
    expect(enable).not.toHaveBeenCalled()
  })

  it('refuses to submit an empty password', async () => {
    const { user } = renderCard()

    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(
      await screen.findByText('Informe sua senha para continuar'),
    ).toBeInTheDocument()
    expect(enable).not.toHaveBeenCalled()
  })

  it('enables 2FA and reveals the backup codes', async () => {
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    await waitFor(() =>
      expect(enable).toHaveBeenCalledWith({ password: 'senha-secreta' }),
    )
    expect(await screen.findByText('Códigos de backup')).toBeInTheDocument()
    expect(screen.getByText('code-aaa')).toBeInTheDocument()
    expect(screen.getByText('code-bbb')).toBeInTheDocument()
    // The confirmation form closes once the codes are on screen.
    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
  })

  it('omits the codes block when the API returns none', async () => {
    enable.mockResolvedValue({ data: {}, error: null })
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    await waitFor(() => expect(enable).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument(),
    )
    expect(screen.queryByText('Códigos de backup')).not.toBeInTheDocument()
  })

  it('hides the codes again when the switch is toggled back', async () => {
    mockSession()
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))
    expect(await screen.findByText('Códigos de backup')).toBeInTheDocument()

    // The session mock still reports 2FA off, so the switch re-opens the
    // "enabling" form — the stale codes must not linger.
    await user.click(toggle())

    expect(screen.queryByText('Códigos de backup')).not.toBeInTheDocument()
  })

  it('shows the API error message and keeps the form open', async () => {
    enable.mockResolvedValue({
      data: null,
      error: { message: 'Senha incorreta' },
    })
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(await screen.findByText('Senha incorreta')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument()
  })

  it('falls back to a generic message when the error has none', async () => {
    enable.mockResolvedValue({ data: null, error: {} })
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(
      await screen.findByText('Não foi possível ativar a 2FA'),
    ).toBeInTheDocument()
  })

  it('shows a busy state while the request is in flight', async () => {
    enable.mockReturnValue(new Promise(() => {}))
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    const busy = await screen.findByRole('button', { name: 'Processando...' })
    expect(busy).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByPlaceholderText('••••••')).toBeDisabled()
    expect(toggle()).toHaveAttribute('aria-disabled', 'true')
  })

  it('closes the form on cancel without calling the API', async () => {
    const { user } = renderCard()

    await startEnabling(user)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
    expect(enable).not.toHaveBeenCalled()
  })
})

describe('<SettingsTwoFactorCard /> disabling', () => {
  beforeEach(() => {
    mockSession({ twoFactorEnabled: true })
  })

  it('asks for the password with the disabling wording', async () => {
    const { user } = renderCard()

    await user.click(toggle())

    expect(screen.getByText('Senha para desativar a 2FA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desativar 2FA' })).toBeEnabled()
  })

  it('disables 2FA and closes the form', async () => {
    const { user } = renderCard()

    await user.click(toggle())
    await user.type(passwordInput(), 'senha-secreta')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    await waitFor(() =>
      expect(disable).toHaveBeenCalledWith({ password: 'senha-secreta' }),
    )
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument(),
    )
  })

  it('shows the API error message and keeps the form open', async () => {
    disable.mockResolvedValue({
      data: null,
      error: { message: 'Senha incorreta' },
    })
    const { user } = renderCard()

    await user.click(toggle())
    await user.type(passwordInput(), 'errada')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    expect(await screen.findByText('Senha incorreta')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument()
  })

  it('falls back to a generic message when the error has none', async () => {
    disable.mockResolvedValue({ data: null, error: {} })
    const { user } = renderCard()

    await user.click(toggle())
    await user.type(passwordInput(), 'errada')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    expect(
      await screen.findByText('Não foi possível desativar a 2FA'),
    ).toBeInTheDocument()
  })
})

describe('<SettingsTwoFactorCard /> backup codes', () => {
  async function renderWithCodes() {
    const utils = renderCard()
    await startEnabling(utils.user)
    await utils.user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))
    await screen.findByText('Códigos de backup')
    return utils
  }

  it('copies every code to the clipboard, newline separated', async () => {
    const { user } = await renderWithCodes()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    await user.click(screen.getByRole('button', { name: 'Copiar códigos' }))

    expect(writeText).toHaveBeenCalledWith('code-aaa\ncode-bbb')
  })

  it('stays silent when the clipboard is unavailable', async () => {
    const { user } = await renderWithCodes()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied'),
    )

    await user.click(screen.getByRole('button', { name: 'Copiar códigos' }))

    expect(screen.getByText('Códigos de backup')).toBeInTheDocument()
  })
})
