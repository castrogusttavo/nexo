import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NexoMarkLoader } from '../nexo-mark-loader'

describe('<NexoMarkLoader />', () => {
  it('announces the loading state in pt-BR', () => {
    render(<NexoMarkLoader />)

    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible()
  })

  it('draws both pieces of the mark in the current text colour', () => {
    const { container } = render(<NexoMarkLoader size={24} />)
    const paths = container.querySelectorAll('path')

    expect(paths).toHaveLength(2)
    for (const path of paths) expect(path).toHaveAttribute('fill', 'currentColor')
    expect(container.querySelector('svg')).toHaveAttribute('width', '24')
  })
})
