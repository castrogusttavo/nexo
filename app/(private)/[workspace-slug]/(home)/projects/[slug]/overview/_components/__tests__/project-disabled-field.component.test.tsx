import { CircleDotIcon } from '@hugeicons-pro/core-stroke-rounded'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectDisabledField } from '../project-disabled-field'

vi.mock('next/navigation', () => ({
  useParams: () => ({ 'workspace-slug': 'acme' }),
}))

describe('<ProjectDisabledField />', () => {
  it('shows what is switched off and why it matters', () => {
    render(
      <ProjectDisabledField
        icon={CircleDotIcon}
        title='Ativar estado do projeto'
        description='Ative os estados para acompanhar o progresso.'
      />,
    )

    expect(screen.getByText('Ativar estado do projeto')).toBeInTheDocument()
    expect(
      screen.getByText('Ative os estados para acompanhar o progresso.'),
    ).toBeInTheDocument()
  })

  it('sends "Habilitar" to the project configuration of the current workspace', () => {
    render(
      <ProjectDisabledField icon={CircleDotIcon} title='T' description='D' />,
    )

    expect(screen.getByRole('link', { name: 'Habilitar' })).toHaveAttribute(
      'href',
      '/acme/settings/resources/project-configuration',
    )
  })
})
