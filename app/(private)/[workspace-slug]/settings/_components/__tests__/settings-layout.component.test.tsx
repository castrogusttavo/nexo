import { act, render, screen, within } from '@testing-library/react'
import { Suspense } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import { SettingsSidebar } from '../settings-sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/acme/settings',
}))

// The sidebar reads `params` with use(), so it suspends until the promise
// settles, as it does under the layout's <Suspense>. The promise has to be
// the same object on every render, or use() suspends again forever.
async function renderLayout() {
  const params = Promise.resolve({ 'workspace-slug': 'acme' })
  let view: ReturnType<typeof render> | undefined
  await act(async () => {
    view = render(
      <Suspense fallback={null}>
        <SettingsSidebar params={params} />
      </Suspense>,
    )
  })
  await screen.findByRole('link', { name: 'Geral' })
  return view as ReturnType<typeof render>
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
