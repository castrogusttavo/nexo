import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserDTO } from '@/types/user'
import { UserDropdownProfile } from '../user-dropdown-profile'

const { push, useSession, signOut } = vi.hoisted(() => ({
  push: vi.fn(),
  useSession: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession, signOut },
}))

// The real profile modal is kept, but its four panes — each with its own
// queries and rich-text editor — are reduced to markers naming the tab.
function stubTab(label: string) {
  return ({ tab }: { tab: string }) => <div>{`Painel ${label} (${tab})`}</div>
}
vi.mock('@/app/_components/user/modal/tabs/user-modal-profile-tab', () => ({
  UserModalProfileTab: stubTab('perfil'),
}))
vi.mock('@/app/_components/user/modal/tabs/user-modal-preferences-tab', () => ({
  UserModalPreferencesTab: stubTab('preferências'),
}))
vi.mock(
  '@/app/_components/user/modal/tabs/user-modal-notifications-tab',
  () => ({ UserModalNotificationsTab: stubTab('notificações') }),
)
vi.mock('@/app/_components/user/modal/tabs/user-modal-security-tab', () => ({
  UserModalSecurityTab: stubTab('segurança'),
}))

const USER: UserDTO = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@nexo.dev',
  username: 'ana',
  emailVerified: true,
  image: null,
  coverImage: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  deletionScheduledAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  onboardingStep: null,
  role: null,
  goals: [],
  memberships: [],
}

function renderDropdown(user: UserDTO = USER) {
  mockFetch().mockResolvedValue(apiSuccess(user))
  return renderWithProviders(<UserDropdownProfile />)
}

async function openMenu(user: ReturnType<typeof renderDropdown>['user']) {
  await user.click(screen.getAllByRole('button')[0])
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
  signOut.mockResolvedValue(undefined)
})

describe('<UserDropdownProfile />', () => {
  it('keeps the menu and the profile modal closed until asked', async () => {
    renderDropdown()

    await screen.findByText('A')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows who is signed in and the actions available', async () => {
    const { user } = renderDropdown()

    await screen.findByText('A')
    await openMenu(user)

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@nexo.dev')).toBeInTheDocument()
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Configurações', 'Preferências', 'Sair'])
  })

  it('falls back to the default cover when the user has none', async () => {
    const { user } = renderDropdown()

    await screen.findByText('A')
    await openMenu(user)

    expect(await screen.findByAltText('background')).toHaveAttribute(
      'src',
      expect.stringContaining('image_1.jpg'),
    )
  })

  it('opens the profile modal on the settings tab', async () => {
    const { user } = renderDropdown()

    await screen.findByText('A')
    await openMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: 'Configurações' }),
    )

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Painel perfil (profile)',
    )
  })

  it('opens the profile modal on the preferences tab', async () => {
    const { user } = renderDropdown()

    await screen.findByText('A')
    await openMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: 'Preferências' }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('tab', { name: 'Preferências' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('signs the user out and sends them to the sign-in page', async () => {
    const { user } = renderDropdown()

    await screen.findByText('A')
    await openMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Sair' }))

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sign-in'))
  })
})
