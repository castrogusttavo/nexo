import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserDTO } from '@/types/user'
import {
  type ProfileTab,
  profileTriggers,
  UserModalCustomProfile,
} from '../user-modal-custom-proile'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

// The four panes have suites of their own; here only the shell matters, so
// each one is reduced to a marker naming the tab it belongs to.
function stubTab(label: string) {
  return ({ tab }: { tab: string }) => (
    <div role='tabpanel' hidden={false}>
      {`Painel ${label} (${tab})`}
    </div>
  )
}
vi.mock('../tabs/user-modal-profile-tab', () => ({
  UserModalProfileTab: stubTab('perfil'),
}))
vi.mock('../tabs/user-modal-preferences-tab', () => ({
  UserModalPreferencesTab: stubTab('preferências'),
}))
vi.mock('../tabs/user-modal-notifications-tab', () => ({
  UserModalNotificationsTab: stubTab('notificações'),
}))
vi.mock('../tabs/user-modal-security-tab', () => ({
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

function renderModal(tab: ProfileTab | null) {
  const onOpenChange = vi.fn()
  return {
    onOpenChange,
    ...renderWithProviders(
      <UserModalCustomProfile tab={tab} onOpenChange={onOpenChange} />,
    ),
  }
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
  mockFetch().mockResolvedValue(apiSuccess(USER))
})

describe('<UserModalCustomProfile />', () => {
  it('stays closed while no tab is requested', () => {
    renderModal(null)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the requested tab and identifies the signed-in user', async () => {
    renderModal('preferences')

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@nexo.dev')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Preferências' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByText('Painel preferências (preferences)'),
    ).toBeInTheDocument()
  })

  it('lists the four areas of the profile', () => {
    renderModal('profile')

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Perfil',
      'Preferências',
      'Notificações',
      'Segurança',
    ])
  })

  it('lets the user move to another area', async () => {
    const { user } = renderModal('profile')

    await user.click(screen.getByRole('tab', { name: 'Segurança' }))

    expect(screen.getByRole('tab', { name: 'Segurança' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('reports the close so the caller can clear the tab', async () => {
    const { user, onOpenChange } = renderModal('profile')

    await user.keyboard('{Escape}')

    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false)
  })

  it('exposes only the two entry points the dropdown offers', () => {
    expect(Object.keys(profileTriggers)).toEqual(['profile', 'preferences'])
    expect(profileTriggers.profile.name).toBe('Configurações')
    expect(profileTriggers.preferences.name).toBe('Preferências')
  })
})
