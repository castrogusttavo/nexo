import { Add01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { NavGroupAccordion } from '../navigation-sidebar-context-accordion'

function renderGroup(
  props: Partial<React.ComponentProps<typeof NavGroupAccordion>> = {},
) {
  return renderWithProviders(
    <NavGroupAccordion label='Projetos' {...props}>
      <a href='/nexo/projects/api'>API</a>
    </NavGroupAccordion>,
  )
}

const trigger = () => screen.getByRole('button', { name: /Projetos/ })

describe('<NavGroupAccordion />', () => {
  it('starts open so the group content is reachable', () => {
    renderGroup()

    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'API' })).toBeInTheDocument()
  })

  it('starts collapsed when the caller asks for it', () => {
    renderGroup({ defaultOpen: false })

    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('collapses and expands again on click', async () => {
    const { user } = renderGroup()

    await user.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('draws the group icon next to the label only when one is given', () => {
    // The icon is decorative, so it has no role of its own: compare the
    // drawings in the trigger with and without it.
    const { unmount } = renderGroup()
    const withoutIcon = trigger().querySelectorAll('svg').length
    unmount()

    renderGroup({ icon: Add01Icon })

    expect(trigger().querySelectorAll('svg')).toHaveLength(withoutIcon + 1)
  })

  it('keeps the row action from toggling the group', async () => {
    const onAction = vi.fn()
    const { user } = renderGroup({
      action: (
        <button type='button' onClick={onAction}>
          Novo projeto
        </button>
      ),
    })

    await user.click(screen.getByRole('button', { name: 'Novo projeto' }))

    expect(onAction).toHaveBeenCalledOnce()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders no action slot when none is given', () => {
    renderGroup()

    expect(
      screen.queryByRole('button', { name: 'Novo projeto' }),
    ).not.toBeInTheDocument()
  })
})
