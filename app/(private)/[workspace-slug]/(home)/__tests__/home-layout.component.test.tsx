import { within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeUserPreferenceDTO } from '@/src/__tests__/factories/user-preference.factory'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import {
  DEFAULT_SIDEBAR_NAVIGATION,
  type SidebarNavigation,
} from '@/src/schemas/user-preference.schema'
import { UserPreferenceService } from '@/src/services/user-preference.service'
import { HomeSidebar } from '../home-sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/acme',
}))

vi.mock('@/src/lib/dal', () => ({
  requireMembership: vi.fn(async () => ({
    user: { id: 'user-1' },
    membership: { workspaceId: 'ws1', role: 'MEMBRE' },
  })),
}))

// The sidebar order is read on the server; signed out on the client, so the
// query stays idle and what renders is exactly that server read.
vi.mock('@/src/services/user-preference.service', () => ({
  UserPreferenceService: { get: vi.fn() },
}))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: null }) },
}))

const getPreferences = vi.mocked(UserPreferenceService.get)

function withNavigation(navigation: SidebarNavigation) {
  getPreferences.mockResolvedValue(
    ok(createFakeUserPreferenceDTO({ navigation })),
  )
}

beforeEach(() => {
  withNavigation(DEFAULT_SIDEBAR_NAVIGATION)
})

// The project tree fetches its own data and guards its own links in
// sidebar-projects.component.test.tsx; here it is only a marker.
vi.mock(
  '@/app/_components/navigation/sidebar-project/sidebar-projects',
  () => ({
    SidebarProjects: ({ base }: { base: string }) => (
      <div>{`Projetos de ${base}`}</div>
    ),
  }),
)

async function renderLayout() {
  const ui = await HomeSidebar({
    params: Promise.resolve({ 'workspace-slug': 'acme' }),
  })
  return renderWithProviders(ui)
}

describe('<HomeLayout /> sidebar', () => {
  it('only links to pages that exist', async () => {
    const { container } = await renderLayout()
    const routes = appPageRoutes()

    const hrefs = [...container.querySelectorAll('a[href]')].map(
      (link) => link.getAttribute('href') ?? '',
    )

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !hasAppPage(href, routes))).toEqual([])
  })

  it('keeps every section reachable', async () => {
    const { container } = await renderLayout()
    const nav = container.querySelector('aside') as HTMLElement

    for (const [name, href] of [
      ['Página inicial', '/acme'],
      ['Rascunhos', '/acme/drafts'],
      ['Seu trabalho', '/acme/profile'],
      ['Notas adesivas', '/acme/stickies'],
      ['Projetos', '/acme/projects'],
      ['Visualizações', '/acme/workspace-views'],
      ['Ciclos', '/acme/active-cycles'],
      ['Análises', '/acme/analytics'],
      ['Arquivados', '/acme/archives'],
      ['Dashboards', '/acme/dashboards'],
    ]) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute(
        'href',
        href,
      )
    }
    expect(within(nav).getByText('Projetos de /acme')).toBeInTheDocument()
  })

  it('follows the stored order', async () => {
    withNavigation({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: [
        { id: 'stickies', visible: true },
        { id: 'your-work', visible: true },
        { id: 'drafts', visible: true },
      ],
    })
    const { container } = await renderLayout()
    const nav = container.querySelector('aside') as HTMLElement

    const names = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
      .filter((name) =>
        ['Rascunhos', 'Seu trabalho', 'Notas adesivas'].includes(name ?? ''),
      )
    expect(names).toEqual(['Notas adesivas', 'Seu trabalho', 'Rascunhos'])
  })

  it('moves hidden items under "Mais" and keeps the fixed ones', async () => {
    withNavigation({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: DEFAULT_SIDEBAR_NAVIGATION.personal.map((i) => ({
        ...i,
        visible: false,
      })),
      workspace: DEFAULT_SIDEBAR_NAVIGATION.workspace.map((i) =>
        i.id === 'dashboards' ? { ...i, visible: false } : i,
      ),
    })
    const { container } = await renderLayout()
    const nav = container.querySelector('aside') as HTMLElement

    expect(within(nav).queryByRole('link', { name: 'Rascunhos' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: 'Dashboards' })).toBeNull()
    expect(
      within(nav).getByRole('link', { name: 'Página inicial' }),
    ).toBeInTheDocument()
    expect(
      within(nav).getByRole('link', { name: 'Projetos' }),
    ).toBeInTheDocument()
    expect(
      within(nav).getByRole('button', { name: 'Mais' }),
    ).toBeInTheDocument()
  })

  it('hides "Mais" when every item is visible', async () => {
    const { container } = await renderLayout()
    const nav = container.querySelector('aside') as HTMLElement

    expect(within(nav).queryByRole('button', { name: 'Mais' })).toBeNull()
  })

  it('falls back to the default navigation when the read fails', async () => {
    getPreferences.mockResolvedValue(err(databaseError()))
    const { container } = await renderLayout()
    const nav = container.querySelector('aside') as HTMLElement

    expect(
      within(nav).getByRole('link', { name: 'Dashboards' }),
    ).toHaveAttribute('href', '/acme/dashboards')
  })
})
