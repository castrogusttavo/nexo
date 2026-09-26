import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ProfileTwoFactorSection } from '../profile-two-factor-section'

const { enable, disable } = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { twoFactor: { enable, disable } },
}))

// A collapsible card inside the profile step: no landmark, no <h1> of its own.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

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

beforeEach(() => {
  enable.mockResolvedValue({
    data: { method: 'otp' },
    error: null,
  })
  disable.mockResolvedValue({ data: {}, error: null })
})

describe('<ProfileTwoFactorSection /> accessibility', () => {
  it('has no violations while collapsed', async () => {
    const { container } = renderWithProviders(
      <ProfileTwoFactorSection twoFactorEnabled={false} hasPassword />,
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations once expanded with 2FA off', async () => {
    const { container } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the switch locked for password-less accounts', async () => {
    const { container } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: false,
    })

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations on the password confirmation form', async () => {
    const { container, user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    expect(screen.getByLabelText('Senha para ativar a 2FA')).toBeInTheDocument()

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations once the second factor is active', async () => {
    const { container, user } = await renderOpen({
      twoFactorEnabled: false,
      hasPassword: true,
    })

    await user.click(screen.getByRole('switch'))
    await user.type(screen.getByPlaceholderText('••••••'), 'my-password')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))
    await screen.findByText('Ativa')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
