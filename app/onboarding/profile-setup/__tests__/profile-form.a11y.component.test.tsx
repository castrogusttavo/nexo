import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ProfileForm } from '../profile-form'

const { saveProfileSetup } = vi.hoisted(() => ({ saveProfileSetup: vi.fn() }))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ saveProfileSetup }))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { twoFactor: { enable: vi.fn(), disable: vi.fn() } },
}))
vi.mock('sonner', () => ({ toast: { promise: vi.fn() } }))

// Onboarding steps render inside a layout that owns the landmarks and the
// <h1>, so the page-level structure rules cannot hold for the step alone.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

const DEFAULT_PROPS = {
  name: 'Ana Souza',
  image: null,
  twoFactorEnabled: false,
  hasPassword: true,
}

beforeEach(() => {
  saveProfileSetup.mockResolvedValue({ ok: true })
})

describe('<ProfileForm /> accessibility', () => {
  it('has no violations on the default step', async () => {
    const { container } = renderWithProviders(
      <ProfileForm {...DEFAULT_PROPS} />,
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with 2FA already active', async () => {
    const { container } = renderWithProviders(
      <ProfileForm {...DEFAULT_PROPS} twoFactorEnabled />,
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the action error shown', async () => {
    saveProfileSetup.mockResolvedValue({
      ok: false,
      error: 'Não foi possível salvar. Tente novamente.',
    })
    const { container, user } = renderWithProviders(
      <ProfileForm {...DEFAULT_PROPS} />,
    )

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByRole('alert')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
