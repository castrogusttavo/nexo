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

    // The inbox shortcut is icon-only, so it is matched by destination.
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href')),
    ).toEqual(['/nexo/get-started', '/nexo/inbox'])
  })

  it('re-points every link when the workspace changes', () => {
    renderWithProviders(<UserHeader slug='atlas' />)

    expect(screen.getByRole('link', { name: 'Comece agora' })).toHaveAttribute(
      'href',
      '/atlas/get-started',
    )
    expect(screen.getByText('Workspace atlas')).toBeInTheDocument()
  })

  it('mounts the help and profile menus', () => {
    renderWithProviders(<UserHeader slug='nexo' />)

    expect(screen.getByText('Ajuda')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })
})
