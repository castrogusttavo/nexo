import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProjectDTO } from '@/src/__tests__/factories/dto/project.dto'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import {
  apiError,
  apiSuccess,
  createTestQueryClient,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ProjectTabs } from '../project-tabs'

const { push, replace, pathname } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  pathname: { current: '' },
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
const BASE = '/acme/projects/alpha'
const PROJECTS_URL = `/api/workspaces/${WORKSPACE_ID}/projects`

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return buildProjectDTO({ workspaceId: WORKSPACE_ID, ...overrides })
}

const BETA = buildProject({ id: 'project-2', name: 'Beta', slug: 'beta' })

type Respond = () => Response | Promise<Response>

/**
 * Answers every request the tabs can make: the picker's list and the
 * project's detail by default (they refetch after a mutation invalidates
 * them), plus per-test overrides keyed as "METHOD url".
 */
function mockApi(project: ProjectDTO, overrides: Record<string, Respond> = {}) {
  return mockFetch().mockImplementation(async (input, init) => {
    const url = String(input)
    const override = overrides[`${init?.method ?? 'GET'} ${url}`]
    if (override) return override()
    if (url === PROJECTS_URL) return apiSuccess([project, BETA])
    if (url === `${PROJECTS_URL}/alpha`) return apiSuccess(project)
    return apiSuccess({})
  })
}

/** Seeds the list and the detail so the first render needs no round trip. */
function renderTabs({
  project = buildProject(),
  canManage = true,
}: {
  project?: ProjectDTO
  canManage?: boolean
} = {}) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(
    [['projects'], WORKSPACE_ID, { archived: false }],
    [project, BETA],
  )
  queryClient.setQueryData([['projects'], WORKSPACE_ID, project.slug], project)
  return renderWithProviders(
    <ProjectTabs
      workspaceId={WORKSPACE_ID}
      workspaceSlug='acme'
      project={project}
      canManage={canManage}
    />,
    { queryClient },
  )
}

async function openMenu(user: ReturnType<typeof renderTabs>['user']) {
  await user.click(
    screen.getByRole('button', { name: 'Opções do projeto Alpha' }),
  )
  return await screen.findByRole('menu')
}

beforeEach(() => {
  push.mockReset()
  replace.mockReset()
  pathname.current = `${BASE}/overview`
})

describe('<ProjectTabs /> sections', () => {
  it('links the sections that have a page', () => {
    renderTabs()

    const nav = screen.getByRole('navigation', { name: 'Seções do projeto' })
    expect(
      within(nav).getByRole('link', { name: 'Visão geral' }),
    ).toHaveAttribute('href', `${BASE}/overview`)
    expect(within(nav).getByRole('link', { name: 'Issues' })).toHaveAttribute(
      'href',
      `${BASE}/issues`,
    )
  })

  it('shows the sections without a page as disabled, not as links', () => {
    renderTabs()

    const nav = screen.getByRole('navigation', { name: 'Seções do projeto' })
    for (const label of ['Ciclos', 'Módulos', 'Visualizações', 'Páginas']) {
      expect(within(nav).queryByRole('link', { name: label })).toBeNull()
      expect(within(nav).getByText(label)).toHaveAttribute(
        'aria-disabled',
        'true',
      )
    }
  })

  it('hides the cycles and modules tabs while their feature is off', () => {
    renderTabs({
      project: buildProject({ cyclesEnabled: false, modulesEnabled: false }),
    })

    const nav = screen.getByRole('navigation', { name: 'Seções do projeto' })
    expect(within(nav).queryByText('Ciclos')).toBeNull()
    expect(within(nav).queryByText('Módulos')).toBeNull()
    expect(within(nav).getByText('Visualizações')).toBeInTheDocument()
  })

  it('marks the overview as current on the landing tab', () => {
    renderTabs()

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Issues' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('keeps Issues current inside a single issue', () => {
    pathname.current = `${BASE}/issues/ALP-12`
    renderTabs()

    expect(screen.getByRole('link', { name: 'Issues' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('only links to sections that have a page', () => {
    const { container } = renderTabs()
    const routes = appPageRoutes()

    const hrefs = [...container.querySelectorAll('a[href]')].map(
      (link) => link.getAttribute('href') ?? '',
    )

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !hasAppPage(href, routes))).toEqual([])
  })
})

describe('<ProjectTabs /> project picker', () => {
  it('keeps the current tab when switching project', async () => {
    pathname.current = `${BASE}/issues/ALP-12`
    const { user } = renderTabs()

    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    await user.click(await screen.findByRole('option', { name: 'Beta' }))

    expect(push).toHaveBeenCalledExactlyOnceWith('/acme/projects/beta/issues')
  })

  it('lands on the overview when switching from a page outside the tabs', async () => {
    pathname.current = `${BASE}/settings`
    const { user } = renderTabs()

    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    await user.click(await screen.findByRole('option', { name: 'Beta' }))

    expect(push).toHaveBeenCalledExactlyOnceWith('/acme/projects/beta/overview')
  })
})

describe('<ProjectTabs /> menu', () => {
  it('opens the project settings', async () => {
    const { user } = renderTabs()

    const menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Configurações' }),
    )

    expect(push).toHaveBeenCalledWith(`${BASE}/settings`)
  })

  it('copies the project url and confirms it', async () => {
    const { user } = renderTabs()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    const menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Copiar link' }),
    )

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}${BASE}`)
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Link copiado'),
    )
  })

  it('reads the favorite label from the cache, not the server snapshot', async () => {
    const favorite = deferredResponse()
    const fetchSpy = mockApi(buildProject(), {
      [`POST ${PROJECTS_URL}/alpha/favorite`]: () => favorite.promise,
    })
    const { user } = renderTabs()

    let menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Adicionar aos favoritos' }),
    )
    await waitFor(() =>
      expect(getFetchCall(fetchSpy)).toMatchObject({
        url: `${PROJECTS_URL}/alpha/favorite`,
        method: 'POST',
      }),
    )

    // Still in flight: only the optimistic cache write can flip the label.
    menu = await openMenu(user)
    expect(
      within(menu).getByRole('menuitem', { name: 'Remover dos favoritos' }),
    ).toBeInTheDocument()

    favorite.resolve(apiSuccess({ favourited: true }))
  })

  it('makes a private project public', async () => {
    const fetchSpy = mockApi(buildProject())
    const { user } = renderTabs()

    const menu = await openMenu(user)
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
    const { user } = renderTabs({ project: buildProject({ isPublic: true }) })

    const menu = await openMenu(user)

    expect(
      within(menu).getByRole('menuitem', { name: 'Tornar privado' }),
    ).toBeInTheDocument()
  })

  it('leaves for the projects page after archiving', async () => {
    mockApi(buildProject(), {
      [`PATCH ${PROJECTS_URL}/alpha/archive`]: () =>
        apiSuccess(buildProject({ archivedAt: '2026-10-12T00:00:00.000Z' })),
    })
    const { user } = renderTabs()

    const menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    )

    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith('/acme/projects'),
    )
    expect(toast.success).toHaveBeenCalledWith('Projeto arquivado')
  })

  it('stays on the project when the archive fails', async () => {
    mockApi(buildProject(), {
      [`PATCH ${PROJECTS_URL}/alpha/archive`]: () =>
        apiError(403, 'Sem permissão'),
    })
    const { user } = renderTabs()

    const menu = await openMenu(user)
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Arquivar projeto' }),
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Sem permissão'),
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('hides publishing and archiving from who cannot manage the project', async () => {
    const { user } = renderTabs({ canManage: false })

    const menu = await openMenu(user)

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

  it('opens the workspace archives', async () => {
    const { user } = renderTabs()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Arquivados' }))

    expect(push).toHaveBeenCalledWith('/acme/archives')
  })

  it('keeps leaving the project disabled until it has a backend', async () => {
    const { user } = renderTabs()

    const menu = await openMenu(user)

    expect(
      within(menu).getByRole('menuitem', { name: 'Sair do projeto' }),
    ).toHaveAttribute('aria-disabled', 'true')
  })
})
