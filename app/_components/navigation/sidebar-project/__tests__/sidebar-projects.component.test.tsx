import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import {
  apiError,
  apiSuccess,
  createTestQueryClient,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { SidebarProjects } from '../sidebar-projects'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/acme',
}))

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

const WORKSPACE_ID = 'ws-1'
const BASE = '/acme'
const PROJECTS_URL = `/api/workspaces/${WORKSPACE_ID}/projects`

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

/** Seeds the projects query so the sidebar renders without a round trip. */
function renderSidebar(projects: ProjectDTO[]) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(
    [['projects'], WORKSPACE_ID, { archived: false }],
    projects,
  )
  return renderWithProviders(
    <SidebarProjects workspaceId={WORKSPACE_ID} base={BASE} />,
    { queryClient },
  )
}

const projectTrigger = (name: string | RegExp) =>
  screen.getByRole('button', { name })

/** The row's "..." menu, a span trigger next to the project name. */
function rowMenu(name: string) {
  return screen.getByRole('button', { name: `Opções do projeto ${name}` })
}

async function openRowMenu(
  user: ReturnType<typeof renderSidebar>['user'],
  name: string,
) {
  await user.click(rowMenu(name))
  return await screen.findByRole('menu')
}

beforeEach(() => {
  push.mockReset()
})

describe('<SidebarProjects /> listing', () => {
  it('lists the non-favorited projects under "Projetos"', async () => {
    renderSidebar([
      buildProject(),
      buildProject({ id: 'project-2', name: 'Beta', slug: 'beta' }),
    ])

    expect(screen.getByText('Projetos')).toBeInTheDocument()
    expect(projectTrigger(/^Alpha$/)).toBeInTheDocument()
    expect(projectTrigger(/^Beta$/)).toBeInTheDocument()
  })

  it('prefixes the name with the project emoji', () => {
    renderSidebar([buildProject({ emoji: '🚀' })])

    expect(projectTrigger(/^🚀 Alpha$/)).toBeInTheDocument()
  })

  it('hides the favorites group while nothing is favorited', () => {
    renderSidebar([buildProject()])

    expect(screen.queryByText('Favoritos')).not.toBeInTheDocument()
  })

  it('moves a favorited project into its own group', async () => {
    const { user } = renderSidebar([
      buildProject({
        id: 'fav',
        name: 'Favorito',
        slug: 'favorito',
        isFavorited: true,
      }),
      buildProject(),
    ])

    // "Projetos" is open by default and holds only the plain project; the
    // favorites group stays collapsed, so its rows are not mounted yet.
    expect(projectTrigger('Alpha')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Favorito' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Favoritos' }))

    expect(
      await screen.findByRole('button', { name: 'Favorito' }),
    ).toBeInTheDocument()
  })

  it('renders nothing but the group when the workspace has no project', () => {
    renderSidebar([])

    expect(screen.getByText('Projetos')).toBeInTheDocument()
    expect(screen.queryByText('Visão geral')).not.toBeInTheDocument()
  })

  it('reveals the project sections when the row is expanded', async () => {
    const { user } = renderSidebar([buildProject()])

    await user.click(projectTrigger(/^Alpha$/))

    expect(
      await screen.findByRole('link', { name: 'Visão geral' }),
    ).toHaveAttribute('href', `${BASE}/projects/alpha/overview`)
    expect(screen.getByRole('link', { name: 'Issues' })).toHaveAttribute(
      'href',
      `${BASE}/projects/alpha/issues`,
    )
  })

  it('only links to project sections that have a page', async () => {
    const { container, user } = renderSidebar([buildProject()])
    await user.click(projectTrigger(/^Alpha$/))
    await screen.findByRole('link', { name: 'Visão geral' })
    const routes = appPageRoutes()

    const hrefs = [...container.querySelectorAll('a[href]')].map(
      (link) => link.getAttribute('href') ?? '',
    )

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !hasAppPage(href, routes))).toEqual([])
  })
})

describe('<SidebarProjects /> row menu', () => {
  it('favorites a project', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ favourited: true }),
    )
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Adicionar aos favoritos' }),
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECTS_URL}/alpha/favorite`,
      method: 'POST',
    })
  })

  it('unfavorites an already favorited project', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess({}))
    const { user } = renderSidebar([buildProject({ isFavorited: true })])

    await user.click(screen.getByRole('button', { name: 'Favoritos' }))
    await screen.findByRole('button', { name: /^Alpha$/ })
    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Remover dos favoritos' }),
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECTS_URL}/alpha/favorite`,
      method: 'DELETE',
    })
  })

  it('reports a failed favorite', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Erro ao favoritar projeto'))
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Adicionar aos favoritos' }),
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro ao favoritar projeto'),
    )
  })

  it('copies the project url', async () => {
    const { user } = renderSidebar([buildProject()])
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Copiar link' }),
    )

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}${BASE}/projects/alpha`,
    )
  })

  it('archives the project and confirms it', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(buildProject()))
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(within(menu).getByRole('menuitem', { name: 'Arquivar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECTS_URL}/alpha/archive`,
      method: 'PATCH',
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Projeto arquivado'),
    )
  })

  it('reports a failed archive', async () => {
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(within(menu).getByRole('menuitem', { name: 'Arquivar' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Sem permissão'),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('navigates to the project settings', async () => {
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Configurações' }),
    )

    expect(push).toHaveBeenCalledWith(`${BASE}/projects/alpha/settings`)
  })
})
