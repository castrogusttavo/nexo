import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { SignInForm } from '../sign-in-form'

const { push, signInEmail, signInSocial, sendOtp, verifyOtp, verifyBackup } =
  vi.hoisted(() => ({
    push: vi.fn(),
    signInEmail: vi.fn(),
    signInSocial: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    verifyBackup: vi.fn(),
  }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    signIn: { email: signInEmail, social: signInSocial },
    twoFactor: {
      sendOtp,
      verifyOtp,
      verifyBackupCode: verifyBackup,
    },
  },
}))

// jsdom lacks ResizeObserver and elementFromPoint, which `input-otp`
// uses on mount to track its caret and password-manager badges.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
document.elementFromPoint ??= () => null

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void }

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const emailInput = () => screen.getByPlaceholderText('nome@empresa.com')
const passwordInput = () => screen.getByPlaceholderText('••••••')

async function fillAndSubmit(
  user: ReturnType<typeof renderWithProviders>['user'],
  email = 'ana@nexo.dev',
  password = 'secret-pass',
) {
  if (email) await user.type(emailInput(), email)
  if (password) await user.type(passwordInput(), password)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

async function reachOtpStep(redirectTo?: string) {
  signInEmail.mockResolvedValue({
    data: { twoFactorRedirect: true },
    error: null,
  })
  const utils = renderWithProviders(<SignInForm redirectTo={redirectTo} />)
  await fillAndSubmit(utils.user)
  await screen.findByText('Confirme seu e-mail')
  return utils
}

beforeEach(() => {
  signInEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  signInSocial.mockResolvedValue({ data: null, error: null })
  sendOtp.mockResolvedValue({ data: {}, error: null })
  verifyOtp.mockResolvedValue({ data: {}, error: null })
  verifyBackup.mockResolvedValue({ data: {}, error: null })
})

describe('<SignInForm /> credentials step', () => {
  it('shows required-field errors and does not call the API when empty', async () => {
    const { user } = renderWithProviders(<SignInForm />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('only flags the missing password when the email is filled', async () => {
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user, 'ana@nexo.dev', '')

    expect(screen.queryByText('E-mail é obrigatório')).not.toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('signs in with the typed credentials and redirects to the target', async () => {
    const { user } = renderWithProviders(
      <SignInForm redirectTo='/acme/issues' />,
    )

    await fillAndSubmit(user)

    expect(signInEmail).toHaveBeenCalledWith({
      email: 'ana@nexo.dev',
      password: 'secret-pass',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/acme/issues'))
    expect(sendOtp).not.toHaveBeenCalled()
  })

  it('redirects to / by default', async () => {
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })

  it('disables the form and shows a pending label while signing in', async () => {
    const pending = deferred<unknown>()
    signInEmail.mockReturnValue(pending.promise)
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    const submit = screen.getByRole('button', { name: 'Entrando...' })
    expect(submit).toBeDisabled()
    expect(emailInput()).toBeDisabled()
    expect(passwordInput()).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /continuar com google/i }),
    ).toBeDisabled()

    pending.resolve({ data: {}, error: null })
    await waitFor(() => expect(push).toHaveBeenCalled())
  })

  it('translates a wrong password to pt-BR and re-enables the form', async () => {
    // The exact shape Better Auth resolves with for bad credentials.
    signInEmail.mockResolvedValue({
      data: null,
      error: {
        status: 401,
        code: 'INVALID_EMAIL_OR_PASSWORD',
        message: 'Invalid email or password',
      },
    })
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    expect(
      await screen.findByText('E-mail ou senha inválidos'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Invalid email or password'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })

  it('never shows an untranslated library message', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'SOMETHING_NEW', message: 'Something new' },
    })
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    expect(
      await screen.findByText('E-mail ou senha inválidos'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Something new')).not.toBeInTheDocument()
  })

  it('translates Better Auth own rate limiter after the retries', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    signInEmail.mockResolvedValue({
      data: null,
      error: {
        status: 429,
        retryAfterSeconds: 0,
        message: 'Too many requests. Please try again later.',
      },
    })
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    expect(
      await screen.findByText(
        'Muitas tentativas. Aguarde um instante e tente novamente',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/too many requests/i)).not.toBeInTheDocument()
  })

  it('falls back to a generic message when the error has none', async () => {
    signInEmail.mockResolvedValue({ data: null, error: { status: 401 } })
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    expect(
      await screen.findByText('E-mail ou senha inválidos'),
    ).toBeInTheDocument()
  })

  it('retries a rate-limited sign in and succeeds on a later attempt', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    signInEmail
      .mockResolvedValueOnce({
        data: null,
        error: { status: 429, retryAfterSeconds: 0 },
      })
      .mockResolvedValueOnce({ data: {}, error: null })
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(signInEmail).toHaveBeenCalledTimes(2)
  })

  it('gives up after two retries and surfaces the rate-limit error', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    signInEmail.mockResolvedValue({
      data: null,
      error: {
        status: 429,
        retryAfterSeconds: 0,
        code: 'RATE_LIMITED',
        message: 'Muitos acessos agora, tente novamente em instantes',
      },
    })
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    expect(
      await screen.findByText(
        'Muitos acessos agora, tente novamente em instantes',
      ),
    ).toBeInTheDocument()
    expect(signInEmail).toHaveBeenCalledTimes(3)
    expect(push).not.toHaveBeenCalled()
  })

  it.each([
    ['Google', 'google'],
    ['GitHub', 'github'],
  ])('starts the %s OAuth flow with the redirect as callback', async (label, provider) => {
    const { user } = renderWithProviders(<SignInForm redirectTo='/acme' />)

    await user.click(
      screen.getByRole('button', {
        name: `Continuar com ${label}`,
      }),
    )

    expect(signInSocial).toHaveBeenCalledWith({
      provider,
      callbackURL: '/acme',
    })
  })

  it('carries the redirect into the sign-up link', () => {
    renderWithProviders(<SignInForm redirectTo='/acme/issues?id=1' />)

    expect(screen.getByRole('link', { name: 'Cadastre-se' })).toHaveAttribute(
      'href',
      `/sign-up?redirect=${encodeURIComponent('/acme/issues?id=1')}`,
    )
  })

  it('links to the plain sign-up page without a custom redirect', () => {
    renderWithProviders(<SignInForm />)

    expect(screen.getByRole('link', { name: 'Cadastre-se' })).toHaveAttribute(
      'href',
      '/sign-up',
    )
  })
})

describe('<SignInForm /> resilience and accessibility', () => {
  it('labels the e-mail and password inputs', () => {
    renderWithProviders(<SignInForm />)

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('name', 'email')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('name', 'password')
  })

  it('shows a connection error and re-enables the form when sign in throws', async () => {
    signInEmail.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = renderWithProviders(<SignInForm />)

    await fillAndSubmit(user)

    expect(
      await screen.findByText(/não foi possível conectar/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })
})

describe('<SignInForm /> two-factor step', () => {
  it('moves to the OTP step and sends the code when 2FA is required', async () => {
    await reachOtpStep()

    expect(screen.getByText('ana@nexo.dev')).toBeInTheDocument()
    expect(sendOtp).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows an error when the OTP email fails to send', async () => {
    sendOtp.mockResolvedValue({ data: null, error: {} })

    await reachOtpStep()

    expect(
      await screen.findByText('Não foi possível enviar o código de acesso'),
    ).toBeInTheDocument()
  })

  it('verifies a 6-digit code and redirects on success', async () => {
    const { user } = await reachOtpStep('/acme')

    await user.type(screen.getByRole('textbox'), '123456')

    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ code: '123456' }),
    )
    await waitFor(() => expect(push).toHaveBeenCalledWith('/acme'))
  })

  it('shows the verification error and stays on the OTP step', async () => {
    verifyOtp.mockResolvedValue({ data: null, error: {} })
    const { user } = await reachOtpStep()

    await user.type(screen.getByRole('textbox'), '654321')

    expect(
      await screen.findByText('Código inválido ou expirado'),
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('goes back to the credentials form', async () => {
    const { user } = await reachOtpStep()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(emailInput()).toBeInTheDocument()
    expect(screen.queryByText('Confirme seu e-mail')).not.toBeInTheDocument()
  })
})

describe('<SignInForm /> backup code step', () => {
  async function reachBackupStep() {
    const utils = await reachOtpStep('/acme')
    await utils.user.click(
      screen.getByRole('button', { name: /usar um código de backup/i }),
    )
    return utils
  }

  it('labels the backup code input', async () => {
    await reachBackupStep()

    expect(screen.getByLabelText('Código de backup')).toBeInTheDocument()
  })

  it('shows a connection error and re-enables verifying when it throws', async () => {
    verifyBackup.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = await reachBackupStep()

    await user.type(screen.getByPlaceholderText('xxxxxxxx'), 'abcd1234')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByText(/não foi possível conectar/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Verificar código' }),
    ).toBeEnabled()
  })

  it('requires a code before verifying', async () => {
    const { user } = await reachBackupStep()

    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(screen.getByText('Informe um código de backup')).toBeInTheDocument()
    expect(verifyBackup).not.toHaveBeenCalled()
  })

  it('verifies the trimmed backup code and redirects', async () => {
    const { user } = await reachBackupStep()

    await user.type(screen.getByPlaceholderText('xxxxxxxx'), '  abcd1234  ')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(verifyBackup).toHaveBeenCalledWith({ code: 'abcd1234' })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/acme'))
  })

  it('shows the error when the backup code is rejected', async () => {
    verifyBackup.mockResolvedValue({ data: null, error: {} })
    const { user } = await reachBackupStep()

    await user.type(screen.getByPlaceholderText('xxxxxxxx'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByText('Código de backup inválido'),
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('returns to the email code step', async () => {
    const { user } = await reachBackupStep()

    await user.click(
      screen.getByRole('button', { name: 'Usar o código enviado por e-mail' }),
    )

    expect(screen.getByText('Confirme seu e-mail')).toBeInTheDocument()
  })
})
