import { screen, waitFor } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ProjectCard } from '../workspace-project-card'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

// next/image needs the Next runtime loader; a plain <img> is enough here.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

const WORKSPACE_ID = 'ws-1'
const FAVORITE_URL = `/api/workspaces/${WORKSPACE_ID}/projects/alpha/favorite`

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Alpha',
    slug: 'alpha',
    identifier: 'ALP',
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: WORKSPACE_ID,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderCard(overrides: Partial<ProjectDTO> = {}) {
  return renderWithProviders(
    <ProjectCard
      project={buildProject(overrides)}
      workspaceSlug='acme'
      workspaceId={WORKSPACE_ID}
    />,
  )
}

const favoriteButton = (name: 'Favoritar' | 'Desfavoritar' = 'Favoritar') =>
  screen.getByRole('button', { name })

/** The icon-only buttons carry no text, so they are found by position. */
function unlabelledButtons() {
  return screen.getAllByRole('button', { name: '' })
}

/** The lock/globe badge is the first tooltip trigger on the card. */
function visibilityBadge() {
  const el = document.querySelector('[data-slot="tooltip-trigger"]')
  if (!(el instanceof HTMLElement)) throw new Error('No visibility badge')
  return el
}

beforeEach(() => {
  push.mockReset()
  useSession.mockReturnValue({
    data: { user: { id: 'user-1', name: 'Ana Souza', image: null } },
    isPending: false,
  })
})

describe('<ProjectCard /> content', () => {
  it('identifies the project by name and slug', () => {
    renderCard()

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
  })

  it('stands in for a missing description', () => {
    renderCard()

    expect(screen.getByText('Sem descrição')).toBeInTheDocument()
  })

  it('shows the description when there is one', () => {
    renderCard({ description: 'Planejamento do trimestre' })

    expect(screen.getByText('Planejamento do trimestre')).toBeInTheDocument()
  })

  it('shows the cover image when the project has one', () => {
    renderCard({ coverImage: '/coverImages/alpha.jpg' })

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      '/coverImages/alpha.jpg',
    )
  })

  it('falls back to a plain header without a cover', () => {
    renderCard()

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
  })

  it('calls a private project private', async () => {
    const { user } = renderCard({ isPublic: false })

    await user.hover(visibilityBadge())

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Privado')
    await waitFor(() =>
      expect(visibilityBadge()).toHaveAccessibleDescription('Privado'),
    )
  })

  it('calls a public project public', async () => {
    const { user } = renderCard({ isPublic: true })

    await user.hover(visibilityBadge())

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Público')
    await waitFor(() =>
      expect(visibilityBadge()).toHaveAccessibleDescription('Público'),
    )
  })
})

describe('<ProjectCard /> navigation', () => {
  it('opens the project when the card is clicked', async () => {
    const { user } = renderCard()

    await user.click(screen.getByText('Alpha'))

    expect(push).toHaveBeenCalledWith('/acme/projects/alpha')
  })

  it('goes to the settings without also opening the project', async () => {
    const { user } = renderCard()

    // The settings cog is the last unlabelled button on the card.
    const settings = unlabelledButtons().at(-1)
    await user.click(settings as HTMLElement)

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/acme/projects/alpha/settings')
  })

  it('copies the project link without opening the project', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    const { user } = renderCard()

    await user.click(screen.getByRole('button', { name: 'Copiar link' }))

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/acme/projects/alpha`,
    )
    expect(push).not.toHaveBeenCalled()
  })
})

describe('<ProjectCard /> favoriting', () => {
  it('favorites a project that is not favorited yet', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () =>
      apiSuccess({ favourited: true }),
    )
    const { user } = renderCard()

    await user.click(favoriteButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: FAVORITE_URL,
      method: 'POST',
    })
    expect(push).not.toHaveBeenCalled()
  })

  it('unfavorites a project that already is', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () => apiSuccess({}))
    const { user } = renderCard({ isFavorited: true })

    await user.click(favoriteButton('Desfavoritar'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: FAVORITE_URL,
      method: 'DELETE',
    })
  })

  it('ignores a second click while the first is still in flight', async () => {
    const deferred = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(deferred.promise)
    const { user } = renderCard()

    await user.click(favoriteButton())
    await user.click(favoriteButton())

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    deferred.resolve(apiSuccess({ favourited: true }))
    await waitFor(() => expect(toast.error).not.toHaveBeenCalled())
  })

  it('takes another try once the first one settled', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () =>
      apiSuccess({ favourited: true }),
    )
    const { user } = renderCard()

    await user.click(favoriteButton())
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    await user.click(favoriteButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })

  it('reports a failed favorite', async () => {
    mockFetch().mockImplementation(async () =>
      apiError(500, 'Erro ao favoritar projeto'),
    )
    const { user } = renderCard()

    await user.click(favoriteButton())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro ao favoritar projeto'),
    )
  })
})
