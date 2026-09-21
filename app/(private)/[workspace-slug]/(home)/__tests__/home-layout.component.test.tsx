import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import HomeLayout from '../layout'

vi.mock('next/navigation', () => ({
  usePathname: () => '/acme',
}))

vi.mock('@/src/lib/auth-session', () => ({
  getAuthSession: vi.fn(async () => ({
    ok: true,
    value: { user: { id: 'user-1' } },
  })),
}))

vi.mock('@/src/lib/workspace-context', () => ({
  getWorkspaceMembership: vi.fn(async () => ({
    ok: true,
    value: { workspaceId: 'ws-1' },
  })),
}))

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
  const ui = await HomeLayout({
    children: <main>conteúdo</main>,
    params: Promise.resolve({ 'workspace-slug': 'acme' }),
  })
  return render(ui)
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
})
