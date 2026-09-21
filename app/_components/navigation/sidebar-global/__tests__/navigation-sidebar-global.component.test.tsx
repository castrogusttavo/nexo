import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { GlobalSidebarNavigation } from '../navigation-sidebar-global'
import { GlobalButtonNavigation } from '../navigation-sidebar-global-button'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname }))

function renderSidebar(pathname: string, slug = 'nexo') {
  usePathname.mockReturnValue(pathname)
  return renderWithProviders(<GlobalSidebarNavigation slug={slug} />)
}

const link = (name: string) => screen.getByRole('link', { name })
const currentName = () =>
  screen
    .getAllByRole('link')
    .filter((element) => element.getAttribute('aria-current') === 'page')
    .map((element) => element.textContent)

describe('<GlobalSidebarNavigation />', () => {
  it('points every section at the current workspace', () => {
    renderSidebar('/nexo', 'atlas')

    expect(link('Projetos')).toHaveAttribute('href', '/atlas')
    expect(link('Wiki')).toHaveAttribute('href', '/atlas/wiki')
    expect(link('IA')).toHaveAttribute('href', '/atlas/ai')
    expect(link('Ajustes')).toHaveAttribute('href', '/atlas/settings')
  })

  it.each([
    ['/nexo', 'Projetos'],
    ['/nexo/projects/api/issues', 'Projetos'],
    ['/nexo/wiki', 'Wiki'],
    ['/nexo/wiki/pages/123', 'Wiki'],
    ['/nexo/ai', 'IA'],
    ['/nexo/settings/members', 'Ajustes'],
  ])('marks %s as being inside %s', (pathname, expected) => {
    renderSidebar(pathname)

    expect(currentName()).toEqual([expected])
  })

  it('does not treat a section route as part of the projects root', () => {
    renderSidebar('/nexo/settings')

    expect(link('Projetos')).not.toHaveAttribute('aria-current')
  })

  it('only links to sections that have a page', () => {
    const { container } = renderSidebar('/nexo')
    const routes = appPageRoutes()

    const hrefs = [...container.querySelectorAll('a[href]')].map(
      (element) => element.getAttribute('href') ?? '',
    )

    expect(hrefs).toHaveLength(4)
    expect(hrefs.filter((href) => !hasAppPage(href, routes))).toEqual([])
  })

  it('keeps a look-alike slug prefix out of the current workspace', () => {
    renderSidebar('/nexo-legacy/wiki')

    expect(currentName()).toEqual([])
  })
})

describe('<GlobalButtonNavigation />', () => {
  it('labels the destination and does not claim to be current', () => {
    renderWithProviders(
      <GlobalButtonNavigation linkNavigation='/nexo/wiki' description='Wiki'>
        <span>icon</span>
      </GlobalButtonNavigation>,
    )

    const wiki = screen.getByRole('link', { name: /Wiki/ })
    expect(wiki).toHaveAttribute('href', '/nexo/wiki')
    expect(wiki).not.toHaveAttribute('aria-current')
  })

  it('marks itself as the current page when active', () => {
    renderWithProviders(
      <GlobalButtonNavigation
        linkNavigation='/nexo/wiki'
        description='Wiki'
        active
      >
        <span>icon</span>
      </GlobalButtonNavigation>,
    )

    expect(screen.getByRole('link', { name: /Wiki/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
