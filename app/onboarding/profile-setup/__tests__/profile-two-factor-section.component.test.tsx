import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ProfileTwoFactorSection } from '../profile-two-factor-section'

const { enable, disable } = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { twoFactor: { enable, disable } },
}))

async function renderOpen(props: {
  twoFactorEnabled: boolean
  hasPassword: boolean
}) {
  const utils = renderWithProviders(<ProfileTwoFactorSection {...props} />)
  await utils.user.click(
    screen.getByRole('button', { name: /verificação em duas etapas/i }),
  )
  return utils
}

const passwordInput = () => screen.getByPlaceholderText('••••••')

beforeEach(() => {
  enable.mockResolvedValue({ data: { method: 'otp' }, error: null })
  disable.mockResolvedValue({ data: {}, error: null })
})

describe('<ProfileTwoFactorSection />', () => {
  it('shows the inactive badge and recommendation when 2FA is off', async () => {
    await renderOpen({ twoFactorEnabled: false, hasPassword: true })

    expect(screen.getByText('Inativa')).toBeInTheDocument()
    expect(
      screen.getByText('Recomendada para maior segurança.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('shows the active badge when 2FA is already on', async () => {
    await renderOpen({ twoFactorEnabled: true, hasPassword: true })

    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Código por e-mail a cada login. Para usar um aplicativo autenticador, vá em configurações de segurança.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('locks the switch for accounts without a password', async () => {
    await renderOpen({ twoFactorEnabled: false, hasPassword: false })

    expect(
      screen.getByText('Disponível apenas para contas com senha definida.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-disabled', 'true')
  })

  it('asks for the password when toggling 2FA on', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))

    expect(screen.getByLabelText('Senha para ativar a 2FA')).toBe(
      passwordInput(),
    )
    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeEnabled()
    expect(enable).not.toHaveBeenCalled()
  })

  it('requires a password before confirming', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe sua senha para continuar',
    )
    expect(enable).not.toHaveBeenCalled()
  })

  // Onboarding asks for the e-mail method explicitly. Leaving `method` out
  // would take better-auth's default, which is the authenticator app: it hands
  // back a secret that still needs to be scanned and verified, and this screen
  // has nowhere to do that — the account would be left half-enrolled.
  it('enables the e-mail second factor with the password', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(enable).toHaveBeenCalledWith({
      password: 'my-password',
      method: 'otp',
    })
    expect(await screen.findByText('Ativa')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
  })

  // The e-mail method has no backup codes: better-auth only mints them for the
  // authenticator app, and here the mailbox already is the recovery path.
  it('does not promise backup codes it cannot deliver', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    await screen.findByText('Ativa')
    expect(screen.queryByText('Códigos de backup')).not.toBeInTheDocument()
  })

  it('shows a processing state while the request is in flight', async () => {
    let resolve!: (value: unknown) => void
    enable.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(screen.getByRole('button', { name: 'Processando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(passwordInput()).toBeDisabled()

    resolve({ data: { method: 'otp' }, error: null })
    await waitFor(() => expect(screen.getByText('Ativa')).toBeInTheDocument())
  })

  it('keeps the form open with the error when enabling fails', async () => {
    enable.mockResolvedValue({
      data: null,
      error: {
        status: 400,
        code: 'INVALID_PASSWORD',
        message: 'Invalid password',
      },
    })
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senha incorreta',
    )
    expect(screen.getByText('Inativa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeEnabled()
  })

  it('falls back to a generic message when enabling fails silently', async () => {
    enable.mockResolvedValue({ data: null, error: {} })
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível ativar a 2FA',
    )
  })

  it('disables 2FA with the password', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: true,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    expect(screen.getByText('Senha para desativar a 2FA')).toBeInTheDocument()
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    expect(disable).toHaveBeenCalledWith({ password: 'my-password' })
    expect(enable).not.toHaveBeenCalled()
    expect(await screen.findByText('Inativa')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
  })

  it('shows the error when disabling fails', async () => {
    disable.mockResolvedValue({ data: null, error: {} })
    const { user } = await renderOpen({
      twoFactorEnabled: true,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível desativar a 2FA',
    )
    expect(screen.getByText('Ativa')).toBeInTheDocument()
  })

  it('cancels the confirmation without calling the API', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'typed')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(enable).not.toHaveBeenCalled()
  })

  it('asks for the password again when the switch is turned back off', async () => {
    const { user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))
    await screen.findByText('Ativa')

    await user.click(screen.getByRole('switch'))

    expect(screen.getByText('Senha para desativar a 2FA')).toBeInTheDocument()
  })
})
