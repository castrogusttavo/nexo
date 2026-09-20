import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { WorkspaceForm } from '../workspace-form'

const { createOnboardingWorkspace } = vi.hoisted(() => ({
  createOnboardingWorkspace: vi.fn(),
}))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ createOnboardingWorkspace }))

// Onboarding steps render inside a layout that owns the landmarks and the
// <h1>, so the page-level structure rules cannot hold for the step alone.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

beforeEach(() => {
  createOnboardingWorkspace.mockResolvedValue({ ok: true })
})

describe('<WorkspaceForm /> accessibility', () => {
  it('has no violations on the empty form', async () => {
    const { container } = renderWithProviders(<WorkspaceForm />)

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations once a name, slug and team size are filled', async () => {
    const { container, user } = renderWithProviders(<WorkspaceForm />)

    await user.type(
      screen.getByRole('textbox', { name: /nome do seu workspace/i }),
      'Acme Labs',
    )
    await user.click(screen.getByRole('button', { name: '11-50' }))

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the action error shown', async () => {
    createOnboardingWorkspace.mockResolvedValue({
      ok: false,
      error: 'Esta URL já está em uso. Escolha outra.',
    })
    const { container, user } = renderWithProviders(<WorkspaceForm />)

    await user.type(
      screen.getByRole('textbox', { name: /nome do seu workspace/i }),
      'Acme',
    )
    await user.click(screen.getByRole('button', { name: 'Criar workspace' }))
    await screen.findByText('Esta URL já está em uso. Escolha outra.')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
