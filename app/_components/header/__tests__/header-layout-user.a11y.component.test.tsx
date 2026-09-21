import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { appPageRoutes, hasAppPage } from '@/src/__tests__/helpers/app-routes'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserDTO } from '@/types/user'
import { UserHeader } from '../header-layout-user'
import { HeaderPromotionBanner } from '../header-promotion-banner'

// Unlike header-layout-user.component.test.tsx, the dropdowns are the real
// ones here: a control nested in another can hide in any of them, and axe only
// sees what is actually rendered.
const { push, useSession } = vi.hoisted(() => ({
  push: vi.fn(),
  useSession: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession, signOut: vi.fn() },
}))

// The profile modal's panes each carry their own queries and a rich-text
// editor; none of them is part of the header bar.
vi.mock('@/app/_components/user/modal/tabs/user-modal-profile-tab', () => ({
  UserModalProfileTab: () => null,
}))
vi.mock('@/app/_components/user/modal/tabs/user-modal-preferences-tab', () => ({
  UserModalPreferencesTab: () => null,
}))
vi.mock(
  '@/app/_components/user/modal/tabs/user-modal-notifications-tab',
  () => ({ UserModalNotificationsTab: () => null }),
)
vi.mock('@/app/_components/user/modal/tabs/user-modal-security-tab', () => ({
  UserModalSecurityTab: () => null,
}))

const USER: UserDTO = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@nexo.dev',
  username: 'ana',
  emailVerified: true,
  image: null,
  coverImage: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  deletionScheduledAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  onboardingStep: null,
  role: null,
  goals: [],
  memberships: [
    { workspaceId: 'ws-1', slug: 'nexo', name: 'Nexo', role: 'OWNER' },
  ],
}

/** The header region of the workspace layout: trial banner + top bar. */
async function renderHeader() {
  mockFetch().mockImplementation(async () => apiSuccess(USER))
  const utils = renderWithProviders(
    <>
      <HeaderPromotionBanner
        endDate={new Date(Date.now() + 2 * 86_400_000).toISOString()}
        plan='PRO'
        slug='nexo'
      />
      <UserHeader slug='nexo' />
    </>,
  )
  // The workspace selector names the workspace once the user query lands.
  await screen.findByRole('button', { name: /Nexo/ })
  return utils
}

/** Every link inside a button, and every button inside a link. */
function nestedControls(root: ParentNode) {
  return [
    ...root.querySelectorAll('a button, a [role="button"]'),
    ...root.querySelectorAll('button a, [role="button"] a'),
  ]
}

beforeEach(() => {
  useSession.mockReturnValue({
    data: { user: { id: 'user-1' } },
    isPending: false,
  })
})

describe('workspace header accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = await renderHeader()

    await expectNoA11yViolations(container, { disabledRules: ['region'] })
  })

  it('nests no control inside another (axe nested-interactive)', async () => {
    const { container } = await renderHeader()

    expect(nestedControls(container)).toEqual([])
    await expectNoA11yViolations(container, {
      runOnly: { type: 'rule', values: ['nested-interactive'] },
    })
  })

  it.each([
    ['Comece agora', '/nexo/get-started'],
    ['Caixa de entrada', '/nexo/inbox'],
    ['Assinar Pro', '/upgrade?plan=PRO&billing=yearly'],
    ['Ver planos', '/nexo/settings/billing'],
  ])('"%s" is one link, announced as a link', async (name, href) => {
    await renderHeader()

    const link = screen.getByRole('link', { name })
    expect(link).toHaveAttribute('href', href)
    expect(link).not.toHaveAttribute('role')
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  })

  it('only links to pages that exist', async () => {
    const { container, user } = await renderHeader()
    await user.click(screen.getByRole('button', { name: 'Ajuda' }))
    await screen.findByRole('menu')
    const routes = appPageRoutes()

    // The open help menu is portalled out of the container.
    const hrefs = [
      ...container.querySelectorAll('a[href]'),
      ...document.querySelectorAll('[role="menu"] a[href]'),
    ]
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/'))

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !hasAppPage(href, routes))).toEqual([])
  })

  it('keeps the help menu links as plain menu items', async () => {
    const { user } = await renderHeader()

    await user.click(screen.getByRole('button', { name: 'Ajuda' }))
    const menu = await screen.findByRole('menu')

    expect(nestedControls(menu)).toEqual([])
    expect(menu.querySelectorAll('a [role="menuitem"]')).toHaveLength(0)
    expect(
      screen.getByRole('menuitem', { name: 'Documentação' }),
    ).toHaveAttribute('href', '/docs')
    await expectNoA11yViolations(menu, {
      runOnly: { type: 'rule', values: ['nested-interactive'] },
    })
  })
})
