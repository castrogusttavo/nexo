import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { MembershipDTO, UserDTO } from '@/types/user'
import { WorkSpaceDropdown } from '../workspace-dropdown-selector'

const { push, useSession } = vi.hoisted(() => ({
  push: vi.fn(),
  useSession: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const MEMBERSHIPS: MembershipDTO[] = [
  { workspaceId: 'ws-1', slug: 'acme', name: 'Acme', role: 'OWNER' },
  { workspaceId: 'ws-2', slug: 'globex', name: 'Globex', role: 'MEMBER' },
]

async function openMenu() {
  mockFetch().mockImplementation(async () =>
    apiSuccess({
      id: 'user-1',
      email: 'ana@nexo.dev',
      memberships: MEMBERSHIPS,
    } satisfies Partial<UserDTO>),
  )
  const utils = renderWithProviders(<WorkSpaceDropdown currentSlug='acme' />)
  await screen.findByText('Acme')
  await utils.user.click(screen.getByRole('button'))
  const menu = await screen.findByRole('menu')
  return { ...utils, menu }
}

beforeEach(() => {
  useSession.mockReturnValue({
    data: { user: { id: 'user-1' } },
    isPending: false,
  })
})

describe('<WorkSpaceDropdown /> accessibility', () => {
  it('has no axe violations while open', async () => {
    await openMenu()

    await expectNoA11yViolations(document.body, {
      disabledRules: [
        'region',
        // Base UI wraps every popup in `data-base-ui-focus-guard` spans that
        // are aria-hidden yet keep tabindex="0" — library code, not ours (see
        // user-modal-preferences-tab.a11y.component.test.tsx).
        'aria-hidden-focus',
      ],
    })
  })

  it('nests no control inside a workspace radio item (axe nested-interactive)', async () => {
    const { menu } = await openMenu()

    for (const radio of within(menu).getAllByRole('menuitemradio')) {
      expect(radio.querySelectorAll('a, button, [role^="menuitem"]')).toEqual(
        expect.objectContaining({ length: 0 }),
      )
    }
    await expectNoA11yViolations(menu, {
      runOnly: { type: 'rule', values: ['nested-interactive'] },
    })
  })

  it.each([
    ['Configurações de Acme', '/acme/settings'],
    ['Convidar membros para Acme', '/acme/settings/members'],
    ['Configurações de Globex', '/globex/settings'],
    ['Convidar membros para Globex', '/globex/settings/members'],
  ])('"%s" is its own menu item, and a link', async (name, href) => {
    const { menu } = await openMenu()

    const item = within(menu).getByRole('menuitem', { name })
    expect(item.tagName).toBe('A')
    expect(item).toHaveAttribute('href', href)
    expect(item.closest('[role="menuitemradio"]')).toBeNull()
  })

  it('names each workspace radio item by the workspace alone', async () => {
    const { menu } = await openMenu()

    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent),
    ).toEqual(['AAcmeOwner', 'GGlobexMember'])
  })
})
