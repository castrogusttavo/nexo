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

const { push, replace, pathname } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  pathname: { current: '/acme' },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => pathname.current,
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

/**
 * Seeds the projects query so the sidebar renders without a round trip. The
 * default viewer leads every built project, so the managing actions show.
 */
function renderSidebar(
  projects: ProjectDTO[],
  { userId = 'user-1', isPrivileged = false } = {},
) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(
    [['projects'], WORKSPACE_ID, { archived: false }],
    projects,
  )
  return renderWithProviders(
    <SidebarProjects
      workspaceId={WORKSPACE_ID}
      base={BASE}
      userId={userId}
      isPrivileged={isPrivileged}
    />,
    { queryClient },
  )
}

const projectLink = (name: string | RegExp) =>
  screen.getByRole('link', { name })

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
  replace.mockReset()
  pathname.current = '/acme'
})

describe('<SidebarProjects /> listing', () => {
  it('lists the non-favorited projects under "Projetos"', async () => {
    renderSidebar([
      buildProject(),
      buildProject({ id: 'project-2', name: 'Beta', slug: 'beta' }),
    ])

    expect(screen.getByText('Projetos')).toBeInTheDocument()
    expect(projectLink(/^Alpha$/)).toBeInTheDocument()
    expect(projectLink(/^Beta$/)).toBeInTheDocument()
  })

  it('prefixes the name with the project emoji', () => {
    renderSidebar([buildProject({ emoji: '🚀' })])

    const row = projectLink(/^Alpha$/)
    expect(row).toHaveTextContent('🚀')
  })

  it('renders a picked icon instead of spelling out its name', () => {
    renderSidebar([buildProject({ emoji: 'rocket:#f97316' })])

    const row = projectLink(/^Alpha$/)
    expect(row.querySelector('svg')).not.toBeNull()
    expect(row).not.toHaveTextContent(/rocket/i)
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
    expect(projectLink('Alpha')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Favorito' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Favoritos' }))

    expect(
      await screen.findByRole('link', { name: 'Favorito' }),
    ).toBeInTheDocument()
  })

  it('renders nothing but the group when the workspace has no project', () => {
    renderSidebar([])

    expect(screen.getByText('Projetos')).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toEqual([])
  })

  it('links each row straight to the project overview', () => {
    renderSidebar([buildProject()])

    expect(projectLink(/^Alpha$/)).toHaveAttribute(
      'href',
      `${BASE}/projects/alpha/overview`,
    )
    // The sections moved to the project tabs: the row has nothing to expand.
    expect(screen.queryByRole('link', { name: 'Issues' })).toBeNull()
  })

  it('keeps the row highlighted on any tab of the project', () => {
    pathname.current = `${BASE}/projects/alpha/issues/ALP-1`
    renderSidebar([
      buildProject(),
      buildProject({ id: 'project-2', name: 'Beta', slug: 'beta' }),
    ])

    expect(projectLink(/^Alpha$/)).toHaveAttribute('aria-current', 'true')
    expect(projectLink(/^Beta$/)).not.toHaveAttribute('aria-current')
  })

  it('does not highlight a project whose slug only shares a prefix', () => {
    pathname.current = `${BASE}/projects/alpha-2/overview`
    renderSidebar([buildProject()])

    expect(projectLink(/^Alpha$/)).not.toHaveAttribute('aria-current')
  })

  it('only links to project sections that have a page', () => {
    const { container } = renderSidebar([buildProject()])
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
    await screen.findByRole('link', { name: /^Alpha$/ })
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
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECTS_URL}/alpha/archive`,
      method: 'PATCH',
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Projeto arquivado'),
    )
    // Archived from elsewhere in the workspace: nothing on screen went away.
    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the project after archiving the one on screen', async () => {
    pathname.current = `${BASE}/projects/alpha/issues`
    mockFetch().mockResolvedValue(apiSuccess(buildProject()))
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    )

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`${BASE}/projects`),
    )
  })

  it('stays on the project when the archive fails', async () => {
    pathname.current = `${BASE}/projects/alpha/issues`
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Sem permissão'),
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('reports a failed archive', async () => {
    mockFetch().mockResolvedValue(apiError(403, 'Sem permissão'))
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    )

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

  it('opens the workspace archives', async () => {
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(within(menu).getByRole('menuitem', { name: 'Arquivados' }))

    expect(push).toHaveBeenCalledWith(`${BASE}/archives`)
  })

  it('makes a private project public', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess(buildProject({ isPublic: true })),
    )
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Tornar público' }),
    )

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Projeto tornado público'),
    )
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECTS_URL}/alpha`,
      method: 'PATCH',
      body: { isPublic: true },
    })
  })

  it('offers to make a public project private', async () => {
    const { user } = renderSidebar([buildProject({ isPublic: true })])

    const menu = await openRowMenu(user, 'Alpha')

    expect(
      within(menu).getByRole('menuitem', { name: 'Tornar privado' }),
    ).toBeInTheDocument()
  })

  it('hides publishing and archiving from a member who does not lead the project', async () => {
    const { user } = renderSidebar([buildProject()], { userId: 'user-2' })

    const menu = await openRowMenu(user, 'Alpha')

    expect(
      within(menu).queryByRole('menuitem', { name: 'Tornar público' }),
    ).toBeNull()
    expect(
      within(menu).queryByRole('menuitem', { name: 'Arquivar projeto' }),
    ).toBeNull()
    expect(
      within(menu).getByRole('menuitem', { name: 'Configurações' }),
    ).toBeInTheDocument()
  })

  it('lets a workspace admin manage a project they do not lead', async () => {
    const { user } = renderSidebar([buildProject()], {
      userId: 'user-2',
      isPrivileged: true,
    })

    const menu = await openRowMenu(user, 'Alpha')

    expect(
      within(menu).getByRole('menuitem', { name: 'Tornar público' }),
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    ).toBeInTheDocument()
  })

  it('keeps leaving the project disabled until it has a backend', async () => {
    const { user } = renderSidebar([buildProject()])

    const menu = await openRowMenu(user, 'Alpha')

    expect(
      within(menu).getByRole('menuitem', { name: 'Sair do projeto' }),
    ).toHaveAttribute('aria-disabled', 'true')
  })
})
