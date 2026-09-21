import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ShortCutButton } from '../shortcut-button'

function renderShortcut() {
  return renderWithProviders(
    <ShortCutButton href='/nexo/inbox' label='Caixa de entrada'>
      <svg aria-hidden='true' />
    </ShortCutButton>,
  )
}

describe('<ShortCutButton /> accessibility', () => {
  it('names the icon-only link after its destination', () => {
    renderShortcut()

    expect(
      screen.getByRole('link', { name: 'Caixa de entrada' }),
    ).toHaveAttribute('href', '/nexo/inbox')
  })

  it('is a single tab stop, not a link nested in a button', () => {
    renderShortcut()

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = renderShortcut()

    await expectNoA11yViolations(container, { disabledRules: ['region'] })
  })
})
