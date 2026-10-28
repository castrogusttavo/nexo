import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserAvatar } from '../user-avatar'

// jsdom never loads images, so Base UI keeps the fallback on screen: these
// tests pin what the fallback shows.
describe('<UserAvatar />', () => {
  it('shows up to two initials of the name', () => {
    render(<UserAvatar name='Ana Maria Souza' image={null} />)

    expect(screen.getByText('AM')).toBeInTheDocument()
  })

  it('takes the initial of an e-mail when there is no name', () => {
    render(<UserAvatar name='ana@nexo.dev' />)

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows a custom fallback instead of the initials', () => {
    render(<UserAvatar name='Ana Souza' fallback='—' />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('AS')).toBeNull()
  })

  it('passes size and class to the avatar root', () => {
    const { container } = render(
      <UserAvatar name='Ana' size='sm' className='border-2' />,
    )

    const root = container.querySelector('[data-slot="avatar"]')
    expect(root).toHaveAttribute('data-size', 'sm')
    expect(root).toHaveClass('border-2')
  })
})
