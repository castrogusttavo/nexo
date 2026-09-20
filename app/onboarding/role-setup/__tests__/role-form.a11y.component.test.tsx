import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { RoleForm } from '../role-form'

const { saveRoleSetup } = vi.hoisted(() => ({ saveRoleSetup: vi.fn() }))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ saveRoleSetup }))

// Onboarding steps render inside a layout that owns the landmarks and the
// <h1>, so the page-level structure rules cannot hold for the step alone.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

beforeEach(() => {
  saveRoleSetup.mockResolvedValue({ ok: true })
})

describe('<RoleForm /> accessibility', () => {
  it('has no violations with no role picked', async () => {
    const { container } = renderWithProviders(<RoleForm />)

    await expectNoA11yViolations(container, {
      disabledRules: FRAGMENT_RULES,
    })
  })

  it('has no violations with a role selected', async () => {
    const { container, user } = renderWithProviders(<RoleForm />)

    await user.click(screen.getByRole('button', { name: /^Designer$/i }))

    await expectNoA11yViolations(container, {
      disabledRules: FRAGMENT_RULES,
    })
  })

  it('has no violations with the action error shown', async () => {
    saveRoleSetup.mockResolvedValue({
      ok: false,
      error: 'Não foi possível salvar. Tente novamente.',
    })
    const { container, user } = renderWithProviders(<RoleForm />)

    await user.click(screen.getByRole('button', { name: /^Developer$/i }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByRole('alert')

    await expectNoA11yViolations(container, {
      disabledRules: FRAGMENT_RULES,
    })
  })
})
