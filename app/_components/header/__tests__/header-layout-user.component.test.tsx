import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { UserHeader } from '../header-layout-user'

// The header is a composition: each dropdown has (or will have) a suite of
// its own, so they are reduced to markers and only the wiring is asserted.
vi.mock(
  '@/app/_components/workspace/workspace-dropdown/workspace-dropdown-selector',
  () => ({
    WorkSpaceDropdown: ({ currentSlug }: { currentSlug: string }) => (
      <div>{`Workspace ${currentSlug}`}</div>
    ),
  }),
)
vi.mock('@/app/_components/user/user-dropdown-helper', () => ({
  UserDropdownHelper: () => <div>Ajuda</div>,
}))
vi.mock('@/app/_components/user/user-dropdown-profile', () => ({
  UserDropdownProfile: () => <div>Perfil</div>,
}))

describe('<UserHeader />', () => {
  it('hands the current workspace slug to the workspace selector', () => {
    renderWithProviders(<UserHeader slug='nexo' />)

    expect(screen.getByText('Workspace nexo')).toBeInTheDocument()
  })

  it('links the get-started and inbox shortcuts to the current workspace', () => {
    renderWithProviders(<UserHeader slug='nexo' />)

    expect(screen.getByRole('link', { name: 'Comece agora' })).toHaveAttribute(
      'href',
      '/nexo/get-started',
    )
    expect(
      screen.getByRole('link', { name: 'Caixa de entrada' }),
    ).toHaveAttribute('href', '/nexo/inbox')
  })

  it('does not nest the icon-only inbox link inside a button', () => {
    renderWithProviders(<UserHeader slug='nexo' />)

    const inbox = screen.getByRole('link', { name: 'Caixa de entrada' })
    expect(inbox.closest('button')).toBeNull()
    expect(inbox.querySelector('button')).toBeNull()
  })

  it('re-points every link when the workspace changes', () => {
    renderWithProviders(<UserHeader slug='atlas' />)

    expect(screen.getByRole('link', { name: 'Comece agora' })).toHaveAttribute(
      'href',
      '/atlas/get-started',
    )
    expect(
      screen.getByRole('link', { name: 'Caixa de entrada' }),
    ).toHaveAttribute('href', '/atlas/inbox')
    expect(screen.getByText('Workspace atlas')).toBeInTheDocument()
  })

  it('mounts the help and profile menus', () => {
    renderWithProviders(<UserHeader slug='nexo' />)

    expect(screen.getByText('Ajuda')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })
})
