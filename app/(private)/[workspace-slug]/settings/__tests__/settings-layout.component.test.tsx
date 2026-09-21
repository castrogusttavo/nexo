import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import SettingsLayout from '../layout'

vi.mock('next/navigation', () => ({
  usePathname: () => '/acme/settings',
}))

async function renderLayout() {
  const ui = await SettingsLayout({
    children: <main>conteúdo</main>,
    params: Promise.resolve({ 'workspace-slug': 'acme' }),
  })
  return render(ui)
}

describe('<SettingsLayout /> sidebar', () => {
  it('reads real routes from app/ (sanity check for the guard below)', () => {
    const routes = appPageRoutes()

    expect(hasAppPage('/acme/settings/billing', routes)).toBe(true)
    expect(hasAppPage('/acme/settings/integrations', routes)).toBe(false)
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
      ['Geral', '/acme/settings'],
      ['Membros', '/acme/settings/members'],
      ['Assinatura e Planos', '/acme/settings/billing'],
    ]) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute(
        'href',
        href,
      )
    }
  })
})
