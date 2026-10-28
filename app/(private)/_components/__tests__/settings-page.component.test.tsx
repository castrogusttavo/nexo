import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SettingsPage } from '../settings-page'

describe('<SettingsPage />', () => {
  it('heads the page with its title and description', () => {
    render(
      <SettingsPage title='Etiquetas' description='Categorize suas issues.'>
        <p>conteúdo</p>
      </SettingsPage>,
    )

    expect(
      screen.getByRole('heading', { name: 'Etiquetas' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Categorize suas issues.')).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('places the action beside the title', () => {
    render(
      <SettingsPage
        title='Etiquetas'
        action={<button type='button'>Adicionar</button>}
      >
        <p>conteúdo</p>
      </SettingsPage>,
    )

    const heading = screen.getByRole('heading', { name: 'Etiquetas' })
    const action = screen.getByRole('button', { name: 'Adicionar' })
    expect(heading.parentElement?.parentElement).toContainElement(action)
  })

  it('centres project settings and lets workspace settings fill the pane', () => {
    const { container, rerender } = render(
      <SettingsPage title='Estados'>
        <p />
      </SettingsPage>,
    )
    expect(container.firstChild).toHaveClass('max-w-225', 'mx-auto')

    rerender(
      <SettingsPage title='Membros' width='full'>
        <p />
      </SettingsPage>,
    )
    expect(container.firstChild).toHaveClass('p-6')
    expect(container.firstChild).not.toHaveClass('max-w-225')
  })
})
