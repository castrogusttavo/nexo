import { screen, waitFor } from '@testing-library/react'
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

function renderMembers(leadId: string | null) {
  return renderWithProviders(<ProjectCardMembers leadId={leadId} />)
}

/** The avatar itself is the tooltip trigger, and it carries no own text. */
function avatar() {
  const el = document.querySelector('[data-slot="tooltip-trigger"]')
  if (!(el instanceof HTMLElement)) throw new Error('No avatar')
  return el
}

/** Hovers the avatar and returns the tooltip it opens. */
async function hoverAvatar(user: ReturnType<typeof renderMembers>['user']) {
  await user.hover(avatar())
  return screen.findByRole('tooltip')
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

    expect(await hoverAvatar(user)).toHaveTextContent('Ana Souza')
    await waitFor(() =>
      expect(avatar()).toHaveAccessibleDescription('Ana Souza'),
    )
  })

  it('calls an unknown lead a member on hover', async () => {
    const { user } = renderMembers('user-2')

    expect(await hoverAvatar(user)).toHaveTextContent('Membro')
    await waitFor(() => expect(avatar()).toHaveAccessibleDescription('Membro'))
  })

  // Deleting a user nulls `leadId` rather than deleting the project, so the
  // card has to render a project that genuinely has nobody leading it.
  describe('when the lead was deleted', () => {
    it('shows a dash instead of borrowing nobody else initials', () => {
      renderMembers(null)

      expect(screen.getByText('—')).toBeInTheDocument()
      expect(screen.queryByText('AS')).not.toBeInTheDocument()
      expect(screen.queryByText('??')).not.toBeInTheDocument()
    })

    it('does not claim the viewer leads it', () => {
      signedInAs({
        id: SIGNED_IN_USER,
        name: 'Ana Souza',
        image: 'https://cdn.nexo.dev/ana.png',
      })
      renderMembers(null)

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('says there is no lead on hover', async () => {
      const { user } = renderMembers(null)

      expect(await hoverAvatar(user)).toHaveTextContent('Sem líder')
      await waitFor(() =>
        expect(avatar()).toHaveAccessibleDescription('Sem líder'),
      )
    })
  })
})
