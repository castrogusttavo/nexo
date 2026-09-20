import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
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

// The sign-in form is a page fragment: it owns no landmark and no <h1>, so
// the page-level structure rules cannot hold here.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

beforeEach(() => {
  signInEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  signInSocial.mockResolvedValue({ data: null, error: null })
  sendOtp.mockResolvedValue({ data: {}, error: null })
  verifyOtp.mockResolvedValue({ data: {}, error: null })
  verifyBackup.mockResolvedValue({ data: {}, error: null })
})

async function reachOtpStep() {
  signInEmail.mockResolvedValue({
    data: { twoFactorRedirect: true },
    error: null,
  })
  const utils = renderWithProviders(<SignInForm redirectTo='/acme' />)
  await utils.user.type(
    screen.getByPlaceholderText('nome@empresa.com'),
    'ana@nexo.dev',
  )
  await utils.user.type(screen.getByPlaceholderText('••••••'), 'secret-pass')
  await utils.user.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByText('Confirme seu e-mail')
  return utils
}

describe('<SignInForm /> accessibility', () => {
  it('has no violations on the credentials step', async () => {
    const { container } = renderWithProviders(<SignInForm />)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the validation errors shown', async () => {
    const { container, user } = renderWithProviders(<SignInForm />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations on the two-factor OTP step', async () => {
    const { container } = await reachOtpStep()

    await expectNoA11yViolations(container, {
      disabledRules: FRAGMENT_RULES,
    })
  })

  it('has no violations on the backup code step', async () => {
    const { container, user } = await reachOtpStep()

    await user.click(
      screen.getByRole('button', { name: /usar um código de backup/i }),
    )
    expect(screen.getByLabelText('Código de backup')).toBeInTheDocument()

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
