import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ProjectCardMembers } from '../workspace-project-card-membres'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const SIGNED_IN_USER = 'user-1'

function signedInAs(user: { id: string; name: string; image?: string | null }) {
  useSession.mockReturnValue({
    data: { user: { image: null, ...user } },
    isPending: false,
  })
}

function renderMembers(leadId: string) {
  return renderWithProviders(<ProjectCardMembers leadId={leadId} />)
}

/** The avatar itself is the tooltip trigger, and it carries no own text. */
function avatar() {
  const el = document.querySelector('[data-slot="tooltip-trigger"]')
  if (!(el instanceof HTMLElement)) throw new Error('No avatar')
  return el
}

// The Base UI tooltip popup carries no role, so it is found by its text.
async function hoverAvatar(user: ReturnType<typeof renderMembers>['user']) {
  await user.hover(avatar())
}

beforeEach(() => {
  signedInAs({ id: SIGNED_IN_USER, name: 'Ana Souza' })
})

describe('<ProjectCardMembers />', () => {
  it('shows the signed-in viewer initials when they lead the project', () => {
    renderMembers(SIGNED_IN_USER)

    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('keeps at most two initials', () => {
    signedInAs({ id: SIGNED_IN_USER, name: 'Ana Maria Souza Lima' })
    renderMembers(SIGNED_IN_USER)

    expect(screen.getByText('AM')).toBeInTheDocument()
  })

  it('ignores the extra spaces of a padded name', () => {
    signedInAs({ id: SIGNED_IN_USER, name: '  Ana   Souza  ' })
    renderMembers(SIGNED_IN_USER)

    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('stays anonymous when someone else leads the project', () => {
    renderMembers('user-2')

    expect(screen.getByText('??')).toBeInTheDocument()
    expect(screen.queryByText('AS')).not.toBeInTheDocument()
  })

  it('stays anonymous while the session is still loading', () => {
    useSession.mockReturnValue({ data: null, isPending: true })
    renderMembers(SIGNED_IN_USER)

    expect(screen.getByText('??')).toBeInTheDocument()
  })

  // The avatar image only replaces the fallback once it has loaded, which
  // never happens in jsdom, so the initials are what a test can see.
  it('keeps the initials up while the viewer avatar loads', () => {
    signedInAs({
      id: SIGNED_IN_USER,
      name: 'Ana Souza',
      image: 'https://cdn.nexo.dev/ana.png',
    })
    renderMembers(SIGNED_IN_USER)

    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('does not borrow the viewer avatar for another lead', () => {
    signedInAs({
      id: SIGNED_IN_USER,
      name: 'Ana Souza',
      image: 'https://cdn.nexo.dev/ana.png',
    })
    renderMembers('user-2')

    expect(screen.getByText('??')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('names the lead on hover', async () => {
    const { user } = renderMembers(SIGNED_IN_USER)

    await hoverAvatar(user)

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
  })

  it('calls an unknown lead a member on hover', async () => {
    const { user } = renderMembers('user-2')

    await hoverAvatar(user)

    expect(await screen.findByText('Membro')).toBeInTheDocument()
  })
})
