import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import ProjectSettingsLayout from '../layout'

vi.mock('next/navigation', () => ({
  usePathname: () => '/acme/projects/web/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('@/src/lib/project-context', () => ({
  getProjectContext: vi.fn(async () => ({ project: { name: 'Web' } })),
}))

async function renderLayout() {
  const ui = await ProjectSettingsLayout({
    children: <main>conteúdo</main>,
    params: Promise.resolve({ 'workspace-slug': 'acme', slug: 'web' }),
  })
  return render(ui)
}

describe('<ProjectSettingsLayout /> sidebar', () => {
  it('reads real routes from app/ (sanity check for the guard below)', () => {
    const routes = appPageRoutes()

    expect(hasAppPage('/acme/projects/web/settings', routes)).toBe(true)
    expect(hasAppPage('/acme/projects/web/settings/labels', routes)).toBe(true)
    expect(hasAppPage('/acme/projects/web/settings/worklogs', routes)).toBe(
      false,
    )
  })

  it('only links to settings sections that have a page', async () => {
    const { container } = await renderLayout()
    const routes = appPageRoutes()

    const hrefs = [...container.querySelectorAll('a[href]')].map(
      (link) => link.getAttribute('href') ?? '',
    )

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !hasAppPage(href, routes))).toEqual([])
  })

  it('keeps every existing section reachable', async () => {
    const { container } = await renderLayout()
    const nav = container.querySelector('aside') as HTMLElement

    for (const [name, href] of [
      ['Geral', '/acme/projects/web/settings'],
      ['Membros', '/acme/projects/web/settings/members'],
      ['Ciclos', '/acme/projects/web/settings/features/cycles'],
      ['Módulos', '/acme/projects/web/settings/features/modules'],
      ['Estados', '/acme/projects/web/settings/states'],
      ['Etiquetas', '/acme/projects/web/settings/labels'],
      ['Estimativas', '/acme/projects/web/settings/estimates'],
    ]) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute(
        'href',
        href,
      )
    }
  })
})
