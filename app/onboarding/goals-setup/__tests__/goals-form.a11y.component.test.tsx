import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { GoalsForm } from '../goals-form'

const { saveGoalsSetup } = vi.hoisted(() => ({ saveGoalsSetup: vi.fn() }))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ saveGoalsSetup }))

// Onboarding steps render inside a layout that owns the landmarks and the
// <h1>, so the page-level structure rules cannot hold for the step alone.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

beforeEach(() => {
  saveGoalsSetup.mockResolvedValue({ ok: true })
})

describe('<GoalsForm /> accessibility', () => {
  it('has no violations with no goal picked', async () => {
    const { container } = renderWithProviders(<GoalsForm />)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with goals checked', async () => {
    const { container, user } = renderWithProviders(<GoalsForm />)

    await user.click(
      screen.getByRole('checkbox', { name: /sprints de engenharia/i }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /roadmaps de produto/i }),
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the action error shown', async () => {
    saveGoalsSetup.mockResolvedValue({
      ok: false,
      error: 'Não foi possível salvar. Tente novamente',
    })
    const { container, user } = renderWithProviders(<GoalsForm />)

    await user.click(
      screen.getByRole('checkbox', { name: /só estou explorando/i }),
    )
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByRole('alert')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
