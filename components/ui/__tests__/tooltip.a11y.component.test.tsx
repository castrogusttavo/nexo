import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

function renderTooltip() {
  return renderWithProviders(
    <Tooltip>
      <TooltipTrigger aria-label='Configurações'>⚙</TooltipTrigger>
      <TooltipContent>Abrir as configurações do projeto</TooltipContent>
    </Tooltip>,
  )
}

describe('<Tooltip /> accessibility', () => {
  it('exposes the popup as a tooltip that describes its trigger', async () => {
    const { user } = renderTooltip()
    const trigger = screen.getByRole('button', { name: 'Configurações' })

    await user.hover(trigger)

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('Abrir as configurações do projeto')
    await waitFor(() =>
      expect(trigger).toHaveAccessibleDescription(
        'Abrir as configurações do projeto',
      ),
    )
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id)
  })

  it('does not point at a tooltip that is not in the document', async () => {
    const { user } = renderTooltip()
    const trigger = screen.getByRole('button', { name: 'Configurações' })

    expect(trigger).not.toHaveAttribute('aria-describedby')

    await user.hover(trigger)
    await screen.findByRole('tooltip')
    await user.unhover(trigger)

    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    )
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('keeps a description the trigger already had', async () => {
    const { user } = renderWithProviders(
      <>
        <p id='hint'>Atalho: S</p>
        <Tooltip>
          <TooltipTrigger aria-describedby='hint'>Salvar</TooltipTrigger>
          <TooltipContent>Salvar alterações</TooltipContent>
        </Tooltip>
      </>,
    )
    const trigger = screen.getByRole('button', { name: 'Salvar' })

    await user.hover(trigger)
    await screen.findByRole('tooltip')

    await waitFor(() =>
      expect(trigger).toHaveAccessibleDescription(
        'Atalho: S Salvar alterações',
      ),
    )
  })

  it('has no axe violations while open', async () => {
    const { user, container } = renderTooltip()

    await user.hover(screen.getByRole('button', { name: 'Configurações' }))
    await screen.findByRole('tooltip')

    await expectNoA11yViolations(document.body, {
      disabledRules: ['region'],
    })
    expect(container).toBeInTheDocument()
  })
})
