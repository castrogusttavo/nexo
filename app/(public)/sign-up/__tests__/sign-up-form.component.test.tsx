import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { SignUpForm } from '../sign-up-form'

const { push, signUpEmail, signInSocial, verifyEmail, sendVerificationOtp } =
  vi.hoisted(() => ({
    push: vi.fn(),
    signUpEmail: vi.fn(),
    signInSocial: vi.fn(),
    verifyEmail: vi.fn(),
    sendVerificationOtp: vi.fn(),
  }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    signUp: { email: signUpEmail },
    signIn: { social: signInSocial },
    emailOtp: { verifyEmail, sendVerificationOtp },
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

const CONSENT_ERROR =
  'Você precisa aceitar os Termos de Serviço e a Política de Privacidade'

type User = ReturnType<typeof renderWithProviders>['user']

const nameInput = () => screen.getByPlaceholderText('Seu nome')
const emailInput = () => screen.getByPlaceholderText('nome@empresa.com')
const passwordInput = () => screen.getByPlaceholderText('••••••')
const termsCheckbox = () =>
  screen.getByRole('checkbox', { name: /termos de serviço/i })
const privacyCheckbox = () =>
  screen.getByRole('checkbox', { name: /política de privacidade/i })
const submitButton = () => screen.getByRole('button', { name: 'Criar conta' })

async function fillForm(
  user: User,
  {
    name = 'Ana Souza',
    email = 'ana@nexo.dev',
    password = 'super-secret',
    terms = true,
    privacy = true,
  } = {},
) {
  if (name) await user.type(nameInput(), name)
  if (email) await user.type(emailInput(), email)
  if (password) await user.type(passwordInput(), password)
  if (terms) await user.click(termsCheckbox())
  if (privacy) await user.click(privacyCheckbox())
}

async function reachOtpStep(redirectTo?: string) {
  const utils = renderWithProviders(<SignUpForm redirectTo={redirectTo} />)
  await fillForm(utils.user)
  await utils.user.click(submitButton())
  await screen.findByText('Confirme seu e-mail')
  return utils
}

beforeEach(() => {
  signUpEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  signInSocial.mockResolvedValue({ data: null, error: null })
  verifyEmail.mockResolvedValue({ data: {}, error: null })
  sendVerificationOtp.mockResolvedValue({ data: {}, error: null })
})

describe('<SignUpForm /> form step', () => {
  it('shows every validation error on an empty submit', async () => {
    const { user } = renderWithProviders(<SignUpForm />)

    await user.click(submitButton())

    expect(
      screen.getByText('Nome deve ter ao menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
    expect(
      screen.getByText('Senha deve ter ao menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(screen.getByText(CONSENT_ERROR)).toBeInTheDocument()
    expect(signUpEmail).not.toHaveBeenCalled()
  })

  it('rejects a one-letter name and a short password', async () => {
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user, { name: 'A', password: '1234567' })
    await user.click(submitButton())

    expect(
      screen.getByText('Nome deve ter ao menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Senha deve ter ao menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(screen.queryByText('E-mail é obrigatório')).not.toBeInTheDocument()
    expect(signUpEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['terms', { terms: false }],
    ['privacy policy', { privacy: false }],
  ])('blocks sign up when the %s box is unchecked', async (_label, overrides) => {
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user, overrides)
    await user.click(submitButton())

    expect(screen.getByText(CONSENT_ERROR)).toBeInTheDocument()
    expect(signUpEmail).not.toHaveBeenCalled()
  })

  it('clears the consent error once a box gets checked', async () => {
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user, { terms: false, privacy: false })
    await user.click(submitButton())
    expect(screen.getByText(CONSENT_ERROR)).toBeInTheDocument()

    await user.click(termsCheckbox())

    expect(screen.queryByText(CONSENT_ERROR)).not.toBeInTheDocument()
  })

  it('creates the account with both consent timestamps and moves to the OTP step', async () => {
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(submitButton())

    expect(signUpEmail).toHaveBeenCalledTimes(1)
    const payload = signUpEmail.mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      name: 'Ana Souza',
      email: 'ana@nexo.dev',
      password: 'super-secret',
    })
    expect(payload.acceptedTermsAt).toBeInstanceOf(Date)
    expect(payload.acceptedPrivacyAt).toBeInstanceOf(Date)

    expect(await screen.findByText('Confirme seu e-mail')).toBeInTheDocument()
    expect(screen.getByText('ana@nexo.dev')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('disables the form while the account is being created', async () => {
    let resolve!: (value: unknown) => void
    signUpEmail.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(submitButton())

    expect(
      screen.getByRole('button', { name: 'Criando conta...' }),
    ).toBeDisabled()
    expect(nameInput()).toBeDisabled()
    expect(emailInput()).toBeDisabled()
    expect(passwordInput()).toBeDisabled()

    resolve({ data: {}, error: null })
    expect(await screen.findByText('Confirme seu e-mail')).toBeInTheDocument()
  })

  it('translates a taken e-mail to pt-BR and keeps the user on the form', async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: {
        status: 422,
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        message: 'User already exists. Use another email.',
      },
    })
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(submitButton())

    expect(
      await screen.findByText('Já existe uma conta com este e-mail'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/user already exists/i)).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
    expect(screen.queryByText('Confirme seu e-mail')).not.toBeInTheDocument()
  })

  it('labels the name, e-mail and password inputs', () => {
    renderWithProviders(<SignUpForm />)

    expect(screen.getByLabelText('Nome')).toHaveAttribute('name', 'name')
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('name', 'email')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('name', 'password')
  })

  it('shows a connection error and re-enables the form when sign up throws', async () => {
    signUpEmail.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(submitButton())

    expect(
      await screen.findByText(/não foi possível conectar/i),
    ).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('falls back to a generic error message', async () => {
    signUpEmail.mockResolvedValue({ data: null, error: {} })
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByText('Erro ao criar conta')).toBeInTheDocument()
  })

  it.each([
    ['Google', 'google'],
    ['GitHub', 'github'],
  ])('starts the %s OAuth flow with the redirect as callback', async (label, provider) => {
    const { user } = renderWithProviders(<SignUpForm redirectTo='/acme' />)

    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`continuar com ${label}`, 'i'),
      }),
    )

    expect(signInSocial).toHaveBeenCalledWith({
      provider,
      callbackURL: '/acme',
    })
  })

  it('carries the redirect into the sign-in link below the form', () => {
    renderWithProviders(<SignUpForm redirectTo='/acme' />)

    const links = screen.getAllByRole('link', { name: 'Entre' })
    expect(
      links.some(
        (link) =>
          link.getAttribute('href') ===
          `/sign-in?redirect=${encodeURIComponent('/acme')}`,
      ),
    ).toBe(true)
  })
})

describe('<SignUpForm /> header', () => {
  it('asks "Já tem conta?" and links to sign-in keeping the redirect', () => {
    renderWithProviders(<SignUpForm redirectTo='/acme' />)

    // Header and footer both offer the way back to sign-in.
    const prompts = screen.getAllByText(/já tem conta\?/i)
    expect(prompts).toHaveLength(2)
    for (const prompt of prompts) {
      const link = prompt.querySelector('a')
      expect(link).toHaveTextContent('Entre')
      expect(link).toHaveAttribute(
        'href',
        `/sign-in?redirect=${encodeURIComponent('/acme')}`,
      )
    }
    expect(screen.queryByText(/não tem conta\?/i)).not.toBeInTheDocument()
  })
})

describe('<SignUpForm /> email verification step', () => {
  it('verifies the typed code for the signed-up email and redirects', async () => {
    const { user } = await reachOtpStep('/onboarding')

    await user.type(screen.getByRole('textbox'), '123456')

    await waitFor(() =>
      expect(verifyEmail).toHaveBeenCalledWith({
        email: 'ana@nexo.dev',
        otp: '123456',
      }),
    )
    await waitFor(() => expect(push).toHaveBeenCalledWith('/onboarding'))
  })

  it('shows the verification error and does not redirect', async () => {
    verifyEmail.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'OTP_EXPIRED', message: 'OTP expired' },
    })
    const { user } = await reachOtpStep()

    await user.type(screen.getByRole('textbox'), '123456')

    expect(
      await screen.findByText('O código expirou. Solicite um novo'),
    ).toBeInTheDocument()
    expect(screen.queryByText('OTP expired')).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a connection error when verification throws', async () => {
    verifyEmail.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user } = await reachOtpStep()

    await user.type(screen.getByRole('textbox'), '123456')

    expect(
      await screen.findByText(/não foi possível conectar/i),
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('falls back to a generic verification error', async () => {
    verifyEmail.mockResolvedValue({ data: null, error: {} })
    const { user } = await reachOtpStep()

    await user.type(screen.getByRole('textbox'), '123456')

    expect(
      await screen.findByText('Código inválido ou expirado'),
    ).toBeInTheDocument()
  })

  it('has no backup code option during sign up', async () => {
    await reachOtpStep()

    expect(
      screen.queryByRole('button', { name: /código de backup/i }),
    ).not.toBeInTheDocument()
  })

  describe('resending the code', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    // The OTP widget holds the resend button behind a 30s cooldown that
    // ticks one second per effect run, so advance it tick by tick.
    async function waitOutCooldown() {
      for (let i = 0; i < 30; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000)
        })
      }
    }

    it('resends a verification OTP to the signed-up email', async () => {
      const { user } = await reachOtpStep()
      await waitOutCooldown()

      await user.click(screen.getByRole('button', { name: 'Reenviar código' }))

      expect(sendVerificationOtp).toHaveBeenCalledWith({
        email: 'ana@nexo.dev',
        type: 'email-verification',
      })
    })

    it('shows an error when the resend fails', async () => {
      sendVerificationOtp.mockResolvedValue({ data: null, error: {} })
      const { user } = await reachOtpStep()
      await waitOutCooldown()

      await user.click(screen.getByRole('button', { name: 'Reenviar código' }))

      expect(
        await screen.findByText('Não foi possível reenviar o código'),
      ).toBeInTheDocument()
    })
  })

  it('returns to the form when going back', async () => {
    const { user } = await reachOtpStep()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(submitButton()).toBeInTheDocument()
  })
})
