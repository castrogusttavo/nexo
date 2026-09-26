import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { UserModalSecurityTwoFactorField } from '../user-modal-security-two-factor-field'

const { enable, disable, generateBackupCodes, verifyTotp, getSession } =
  vi.hoisted(() => ({
    enable: vi.fn(),
    disable: vi.fn(),
    generateBackupCodes: vi.fn(),
    verifyTotp: vi.fn(),
    getSession: vi.fn(),
  }))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    twoFactor: { enable, disable, generateBackupCodes, verifyTotp },
    getSession,
  },
}))

const TOTP_URI =
  'otpauth://totp/Nexo:dev@nexopm.com?secret=JBSWY3DPEHPK3PXP&issuer=Nexo'

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

// `userEvent.setup()` installs its own clipboard stub on the window, so the
// spy has to be taken after the render, not before.
function spyOnClipboard() {
  return vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
}

function renderField(
  props: Partial<{
    twoFactorEnabled: boolean
    isPending: boolean
    hasPassword: boolean | null
  }> = {},
) {
  return renderWithProviders(
    <UserModalSecurityTwoFactorField
      twoFactorEnabled={props.twoFactorEnabled ?? false}
      isPending={props.isPending ?? false}
      hasPassword={props.hasPassword ?? true}
    />,
  )
}

const switchControl = () => screen.getByRole('switch')
const passwordInput = () => screen.getByPlaceholderText('••••••')

beforeEach(() => {
  enable.mockResolvedValue({
    data: {
      method: 'totp',
      totpURI: TOTP_URI,
      backupCodes: ['code-aaa', 'code-bbb'],
    },
    error: null,
  })
  verifyTotp.mockResolvedValue({ data: {}, error: null })
  disable.mockResolvedValue({ data: {}, error: null })
  generateBackupCodes.mockResolvedValue({
    data: { backupCodes: ['new-aaa', 'new-bbb'] },
    error: null,
  })
  getSession.mockResolvedValue({ data: null, error: null })
})

describe('<UserModalSecurityTwoFactorField /> switch', () => {
  it('explains 2FA and leaves the switch usable for password accounts', () => {
    renderField()

    expect(
      screen.getByText(
        'Exija um segundo fator no login: um aplicativo autenticador ou um código de 6 dígitos por e-mail.',
      ),
    ).toBeInTheDocument()
    expect(switchControl()).not.toBeChecked()
    expect(switchControl()).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('asks for a password to be set before 2FA can be enabled', () => {
    renderField({ hasPassword: false })

    expect(
      screen.getByText(
        'Defina uma senha antes de ativar a verificação em duas etapas.',
      ),
    ).toBeInTheDocument()
    expect(switchControl()).toHaveAttribute('aria-disabled', 'true')
  })

  it('locks the switch while the parent query is still loading', () => {
    renderField({ hasPassword: null, isPending: true })

    expect(switchControl()).toHaveAttribute('aria-disabled', 'true')
  })

  it('hides the backup-codes action while 2FA is off', () => {
    renderField()

    expect(
      screen.queryByRole('button', { name: 'Gerar novos códigos de backup' }),
    ).not.toBeInTheDocument()
  })
})

describe('<UserModalSecurityTwoFactorField /> enabling', () => {
  it('asks for the password without calling the API', async () => {
    const { user } = renderField()

    await user.click(switchControl())

    expect(screen.getByLabelText('Senha para ativar a 2FA')).toBe(
      passwordInput(),
    )
    expect(enable).not.toHaveBeenCalled()
    // The switch is frozen until the confirmation resolves one way or another.
    expect(switchControl()).toHaveAttribute('aria-disabled', 'true')
  })

  it('refuses to submit an empty password', async () => {
    const { user } = renderField()

    await user.click(switchControl())
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe sua senha para continuar',
    )
    expect(enable).not.toHaveBeenCalled()
  })

  // The authenticator secret is only worth anything once the user proves the
  // app produced a code from it, so the codes come after the verification,
  // never straight out of `enable`.
  it('enrols the authenticator app before revealing the backup codes', async () => {
    const { user } = renderField()

    await user.click(switchControl())
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(enable).toHaveBeenCalledWith({
      password: 'my-password',
      method: 'totp',
    })
    expect(
      await screen.findByLabelText('QR code para o aplicativo autenticador'),
    ).toBeInTheDocument()
    expect(screen.queryByText('code-aaa')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Código do aplicativo'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar código' }))

    expect(verifyTotp).toHaveBeenCalledWith({ code: '123456' })
    expect(await screen.findByText('Códigos de backup')).toBeInTheDocument()
    expect(screen.getByText('code-aaa')).toBeInTheDocument()
    expect(screen.getByText('code-bbb')).toBeInTheDocument()
    await waitFor(() =>
      expect(getSession).toHaveBeenCalledWith({
        query: { disableCookieCache: true },
      }),
    )
  })

  it('enables the e-mail method without an authenticator round trip', async () => {
    enable.mockResolvedValue({ data: { method: 'otp' }, error: null })
    const { user } = renderField()

    await user.click(switchControl())
    await user.click(screen.getByLabelText(/Código por e-mail/))
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(enable).toHaveBeenCalledWith({
      password: 'my-password',
      method: 'otp',
    })
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument(),
    )
    expect(verifyTotp).not.toHaveBeenCalled()
    expect(screen.queryByText('Códigos de backup')).not.toBeInTheDocument()
  })

  it('shows a processing state while the request is in flight', async () => {
    let resolve!: (value: unknown) => void
    enable.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderField()

    await user.click(switchControl())
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(
      screen.getByRole('button', { name: 'Processando...' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(passwordInput()).toBeDisabled()

    resolve({ data: { method: 'otp' }, error: null })
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument(),
    )
    // An empty set has nothing worth showing.
    expect(screen.queryByText('Códigos de backup')).not.toBeInTheDocument()
  })

  it('keeps the form open with the backend error', async () => {
    enable.mockResolvedValue({
      data: null,
      error: {
        status: 400,
        code: 'INVALID_PASSWORD',
        message: 'Invalid password',
      },
    })
    const { user } = renderField()

    await user.click(switchControl())
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senha incorreta',
    )
    expect(getSession).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeEnabled()
  })

  it('falls back to a generic message when the failure has none', async () => {
    enable.mockResolvedValue({ data: null, error: {} })
    const { user } = renderField()

    await user.click(switchControl())
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível ativar a 2FA',
    )
  })

  it('cancels the confirmation without calling the API', async () => {
    const { user } = renderField()

    await user.click(switchControl())
    await user.type(passwordInput(), 'typed')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
    expect(enable).not.toHaveBeenCalled()
    expect(switchControl()).not.toHaveAttribute('aria-disabled', 'true')
  })
})

describe('<UserModalSecurityTwoFactorField /> disabling', () => {
  it('disables 2FA with the password and refreshes the session', async () => {
    const { user } = renderField({ twoFactorEnabled: true })

    await user.click(switchControl())
    expect(screen.getByLabelText('Senha para desativar a 2FA')).toBe(
      passwordInput(),
    )
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    expect(disable).toHaveBeenCalledWith({ password: 'my-password' })
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument(),
    )
    expect(getSession).toHaveBeenCalledWith({
      query: { disableCookieCache: true },
    })
  })

  it('shows the error and keeps the session untouched when it fails', async () => {
    disable.mockResolvedValue({ data: null, error: {} })
    const { user } = renderField({ twoFactorEnabled: true })

    await user.click(switchControl())
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Desativar 2FA' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível desativar a 2FA',
    )
    expect(getSession).not.toHaveBeenCalled()
  })
})

describe('<UserModalSecurityTwoFactorField /> backup codes', () => {
  it('regenerates the codes without touching the session', async () => {
    const { user } = renderField({ twoFactorEnabled: true })

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )
    expect(
      screen.getByLabelText('Senha para gerar novos códigos de backup'),
    ).toBe(passwordInput())
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Gerar códigos' }))

    expect(generateBackupCodes).toHaveBeenCalledWith({
      password: 'my-password',
    })
    expect(await screen.findByText('new-aaa')).toBeInTheDocument()
    expect(screen.getByText('new-bbb')).toBeInTheDocument()
    expect(getSession).not.toHaveBeenCalled()
  })

  it('shows the error when regenerating fails', async () => {
    generateBackupCodes.mockResolvedValue({
      data: null,
      error: {
        status: 400,
        code: 'INVALID_PASSWORD',
        message: 'Invalid password',
      },
    })
    const { user } = renderField({ twoFactorEnabled: true })

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Gerar códigos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senha incorreta',
    )
  })

  it('falls back to a generic message when regenerating fails silently', async () => {
    generateBackupCodes.mockResolvedValue({ data: null, error: {} })
    const { user } = renderField({ twoFactorEnabled: true })

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )
    await user.type(passwordInput(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Gerar códigos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível gerar novos códigos',
    )
  })

  it('copies the codes to the clipboard', async () => {
    const { user } = renderField({ twoFactorEnabled: true })
    const writeText = spyOnClipboard()

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Gerar códigos' }))
    await screen.findByText('new-aaa')

    await user.click(screen.getByRole('button', { name: 'Copiar códigos' }))

    expect(writeText).toHaveBeenCalledWith('new-aaa\nnew-bbb')
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Códigos de backup copiados'),
    )
  })

  it('stays quiet when the clipboard is unavailable', async () => {
    const { user } = renderField({ twoFactorEnabled: true })
    const writeText = spyOnClipboard().mockRejectedValue(new Error('denied'))

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Gerar códigos' }))
    await screen.findByText('new-aaa')

    await user.click(screen.getByRole('button', { name: 'Copiar códigos' }))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('clears the visible codes when the confirmation starts again', async () => {
    const { user } = renderField({ twoFactorEnabled: true })

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )
    await user.type(passwordInput(), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Gerar códigos' }))
    await screen.findByText('new-aaa')

    await user.click(
      screen.getByRole('button', { name: 'Gerar novos códigos de backup' }),
    )

    expect(screen.queryByText('new-aaa')).not.toBeInTheDocument()
  })
})
