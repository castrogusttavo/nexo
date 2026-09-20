import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
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

// The sign-up form is a page fragment: it owns no landmark and no <h1>, so
// the page-level structure rules cannot hold here.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

beforeEach(() => {
  signUpEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  signInSocial.mockResolvedValue({ data: null, error: null })
  verifyEmail.mockResolvedValue({ data: {}, error: null })
  sendVerificationOtp.mockResolvedValue({ data: {}, error: null })
})

async function fillForm(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza')
  await user.type(
    screen.getByPlaceholderText('nome@empresa.com'),
    'ana@nexo.dev',
  )
  await user.type(screen.getByPlaceholderText('••••••'), 'super-secret')
  await user.click(screen.getByRole('checkbox', { name: /termos de serviço/i }))
  await user.click(
    screen.getByRole('checkbox', { name: /política de privacidade/i }),
  )
}

describe('<SignUpForm /> accessibility', () => {
  it('has no violations on the form step', async () => {
    const { container } = renderWithProviders(<SignUpForm />)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the validation errors shown', async () => {
    const { container, user } = renderWithProviders(<SignUpForm />)

    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations on the e-mail verification step', async () => {
    const { container, user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    await screen.findByText('Confirme seu e-mail')

    await expectNoA11yViolations(container, {
      disabledRules: FRAGMENT_RULES,
    })
  })
})
