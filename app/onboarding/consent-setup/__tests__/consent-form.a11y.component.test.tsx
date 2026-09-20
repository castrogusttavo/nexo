import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ConsentForm } from '../consent-form'

const { acceptOnboardingConsent } = vi.hoisted(() => ({
  acceptOnboardingConsent: vi.fn(),
}))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ acceptOnboardingConsent }))

// Onboarding steps render inside a layout that owns the landmarks and the
// <h1>, so the page-level structure rules cannot hold for the step alone.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

beforeEach(() => {
  acceptOnboardingConsent.mockResolvedValue({ ok: true })
})

describe('<ConsentForm /> accessibility', () => {
  it('has no violations with both documents unaccepted', async () => {
    const { container } = renderWithProviders(<ConsentForm />)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with both boxes checked', async () => {
    const { container, user } = renderWithProviders(<ConsentForm />)

    await user.click(
      screen.getByRole('checkbox', { name: /termos de serviço/i }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /política de privacidade/i }),
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the action error shown', async () => {
    acceptOnboardingConsent.mockResolvedValue({
      ok: false,
      error: 'Não foi possível salvar seu consentimento. Tente novamente',
    })
    const { container, user } = renderWithProviders(<ConsentForm />)

    await user.click(
      screen.getByRole('checkbox', { name: /termos de serviço/i }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /política de privacidade/i }),
    )
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByRole('alert')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
