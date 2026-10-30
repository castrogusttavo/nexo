import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkspaceLogo } from '../workspace-logo'

describe('<WorkspaceLogo />', () => {
  it('shows the first letter, uppercased, when there is no logo', () => {
    render(<WorkspaceLogo name='acme' image={null} />)

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('treats a missing image like no logo', () => {
    render(<WorkspaceLogo name='globex' />)

    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('shows the logo, cropped to fill, when there is one', () => {
    const { container } = render(
      <WorkspaceLogo
        name='acme'
        image='https://silo.example.com/workspace-logos/ws-1/logo.png'
      />,
    )

    const img = container.querySelector('img')
    expect(img).toHaveAttribute(
      'src',
      'https://silo.example.com/workspace-logos/ws-1/logo.png',
    )
    expect(img).toHaveClass('object-cover')
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('applies the size and radius it is given to both states', () => {
    const { container, rerender } = render(
      <WorkspaceLogo name='acme' className='size-6 rounded-sm' />,
    )
    expect(container.firstElementChild).toHaveClass('size-6', 'rounded-sm')

    rerender(
      <WorkspaceLogo
        name='acme'
        image='https://x/l.png'
        className='size-6 rounded-sm'
      />,
    )
    expect(container.firstElementChild).toHaveClass('size-6', 'rounded-sm')
  })

  it('keeps the decorative image out of the accessibility tree name', () => {
    const { container } = render(
      <WorkspaceLogo name='acme' image='https://x/l.png' />,
    )

    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})
