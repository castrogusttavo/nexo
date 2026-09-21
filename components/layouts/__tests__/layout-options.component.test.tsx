import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { LayoutOptions, OptionButton } from '../layout-options'

function renderOptions(
  props: { active?: boolean; onClick?: () => void } = {},
) {
  const onClick = props.onClick ?? vi.fn()
  return {
    onClick,
    ...renderWithProviders(
      <LayoutOptions>
        <OptionButton content='Lista' active={props.active} onClick={onClick}>
          Lista
        </OptionButton>
        <OptionButton content='Quadro'>Quadro</OptionButton>
      </LayoutOptions>,
    ),
  }
}

describe('<LayoutOptions />', () => {
  it('groups every option it is given', () => {
    renderOptions()

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Lista', 'Quadro'])
  })

  it('reports the clicked option', async () => {
    const { user, onClick } = renderOptions()

    await user.click(screen.getByRole('button', { name: 'Lista' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does nothing when an option has no handler', async () => {
    const { user, onClick } = renderOptions()

    await user.click(screen.getByRole('button', { name: 'Quadro' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('describes the option on hover', async () => {
    const { user } = renderWithProviders(
      <LayoutOptions>
        <OptionButton content='Visão em lista'>Lista</OptionButton>
      </LayoutOptions>,
    )

    const option = screen.getByRole('button', { name: 'Lista' })
    await user.hover(option)

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Visão em lista',
    )
    await waitFor(() =>
      expect(option).toHaveAccessibleDescription('Visão em lista'),
    )
  })

  it('tells the active option apart from the inactive ones', () => {
    renderOptions({ active: true })

    // The option in use is filled in; the others stay secondary.
    expect(screen.getByRole('button', { name: 'Lista' }).className).toContain(
      'bg-primary',
    )
    expect(screen.getByRole('button', { name: 'Quadro' }).className).toContain(
      'bg-secondary',
    )
  })
})
