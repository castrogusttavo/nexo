import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { TwoFactorEnrollment } from '../two-factor-enrollment'

const { enable, verifyTotp, getSession } = vi.hoisted(() => ({
  enable: vi.fn(),
  verifyTotp: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { twoFactor: { enable, verifyTotp }, getSession },
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

const TOTP_URI =
  'otpauth://totp/Nexo:dev@nexopm.com?secret=JBSWY3DPEHPK3PXP&issuer=Nexo'

function renderEnrollment() {
  const onEnabled = vi.fn()
  const onCancel = vi.fn()
  const utils = renderWithProviders(
    <TwoFactorEnrollment onEnabled={onEnabled} onCancel={onCancel} />,
  )
  return { ...utils, onEnabled, onCancel }
}

const passwordInput = () => screen.getByPlaceholderText('••••••')
const submit = () => screen.getByRole('button', { name: 'Ativar 2FA' })

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
  getSession.mockResolvedValue({ data: null, error: null })
})

describe('<TwoFactorEnrollment /> method choice', () => {
  it('defaults to the authenticator app', () => {
    renderEnrollment()

    expect(screen.getByLabelText(/Aplicativo autenticador/)).toBeChecked()
    expect(screen.getByLabelText(/Código por e-mail/)).not.toBeChecked()
  })

  it('refuses to submit without a password', async () => {
    const { user } = renderEnrollment()

    await user.click(submit())

    expect(screen.getByText('Informe sua senha para continuar')).toBeVisible()
    expect(enable).not.toHaveBeenCalled()
  })

  it('reports the API error and keeps the form open', async () => {
    enable.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'INVALID_PASSWORD' },
    })
    const { user } = renderEnrollment()

    await user.type(passwordInput(), 'wrong')
    await user.click(submit())

    expect(await screen.findByText('Senha incorreta')).toBeInTheDocument()
    expect(passwordInput()).toBeInTheDocument()
  })
})

describe('<TwoFactorEnrollment /> e-mail method', () => {
  // The address is already verified by the time anyone reaches this screen, so
  // there is nothing left to prove: the factor is on when the call returns.
  it('activates in a single round trip, with no codes to store', async () => {
    enable.mockResolvedValue({ data: { method: 'otp' }, error: null })
    const { user, onEnabled } = renderEnrollment()

    await user.click(screen.getByLabelText(/Código por e-mail/))
    await user.type(passwordInput(), 'senha-secreta')
    await user.click(submit())

    await waitFor(() =>
      expect(enable).toHaveBeenCalledWith({
        password: 'senha-secreta',
        method: 'otp',
      }),
    )
    await waitFor(() => expect(onEnabled).toHaveBeenCalled())
    expect(verifyTotp).not.toHaveBeenCalled()
    expect(screen.queryByText('Códigos de backup')).not.toBeInTheDocument()
  })

  it('refreshes the session so the switch reflects the new state', async () => {
    enable.mockResolvedValue({ data: { method: 'otp' }, error: null })
    const { user } = renderEnrollment()

    await user.click(screen.getByLabelText(/Código por e-mail/))
    await user.type(passwordInput(), 'senha-secreta')
    await user.click(submit())

    await waitFor(() =>
      expect(getSession).toHaveBeenCalledWith({
        query: { disableCookieCache: true },
      }),
    )
  })
})

describe('<TwoFactorEnrollment /> authenticator method', () => {
  async function reachScanStep() {
    const utils = renderEnrollment()
    await utils.user.type(passwordInput(), 'senha-secreta')
    await utils.user.click(submit())
    await screen.findByLabelText('QR code para o aplicativo autenticador')
    return utils
  }

  it('shows the QR code and the secret for apps that cannot scan', async () => {
    await reachScanStep()

    expect(
      screen.getByLabelText('QR code para o aplicativo autenticador'),
    ).toBeInTheDocument()
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
  })

  // The whole point of the verification step: a secret nobody proved they
  // scanned is a secret that locks the account at the next sign-in, so the
  // backup codes stay hidden until a real code comes back from the app.
  it('withholds the backup codes until a code is verified', async () => {
    const { user, onEnabled } = await reachScanStep()

    expect(screen.queryByText('code-aaa')).not.toBeInTheDocument()
    expect(onEnabled).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Código do aplicativo'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar código' }))

    await waitFor(() =>
      expect(verifyTotp).toHaveBeenCalledWith({ code: '123456' }),
    )
    expect(await screen.findByText('code-aaa')).toBeInTheDocument()
    expect(screen.getByText('code-bbb')).toBeInTheDocument()
  })

  it('keeps the user on the scan step when the code is wrong', async () => {
    verifyTotp.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'INVALID_TWO_FACTOR_AUTHENTICATION' },
    })
    const { user } = await reachScanStep()

    await user.type(screen.getByLabelText('Código do aplicativo'), '000000')
    await user.click(screen.getByRole('button', { name: 'Confirmar código' }))

    expect(
      await screen.findByText('Código inválido ou expirado'),
    ).toBeInTheDocument()
    expect(screen.queryByText('code-aaa')).not.toBeInTheDocument()
  })

  it('refuses an empty code without calling the API', async () => {
    const { user } = await reachScanStep()

    await user.click(screen.getByRole('button', { name: 'Confirmar código' }))

    expect(screen.getByText('Informe o código do aplicativo')).toBeVisible()
    expect(verifyTotp).not.toHaveBeenCalled()
  })

  it('copies the backup codes, newline separated', async () => {
    const { user } = await reachScanStep()
    await user.type(screen.getByLabelText('Código do aplicativo'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar código' }))
    await screen.findByText('code-aaa')

    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Copiar códigos' }))

    expect(writeText).toHaveBeenCalledWith('code-aaa\ncode-bbb')
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Códigos de backup copiados'),
    )
  })

  it('closes only when the codes have been acknowledged', async () => {
    const { user, onEnabled } = await reachScanStep()
    await user.type(screen.getByLabelText('Código do aplicativo'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar código' }))
    await screen.findByText('code-aaa')

    expect(onEnabled).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Concluir' }))

    expect(onEnabled).toHaveBeenCalled()
  })
})
