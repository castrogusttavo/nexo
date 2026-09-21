import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { MembershipDTO, UserDTO } from '@/types/user'
import { WorkSpaceDropdown } from '../workspace-dropdown-selector'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const ACME: MembershipDTO = {
  workspaceId: 'ws-1',
  slug: 'acme',
  name: 'Acme',
  role: 'OWNER',
}

const GLOBEX: MembershipDTO = {
  workspaceId: 'ws-2',
  slug: 'globex',
  name: 'Globex',
  role: 'MEMBER',
}

function buildUser(memberships: MembershipDTO[]): Partial<UserDTO> {
  return { id: 'user-1', email: 'ana@nexo.dev', memberships }
}

async function renderDropdown(
  memberships: MembershipDTO[] = [ACME, GLOBEX],
  currentSlug = 'acme',
) {
  mockFetch().mockImplementation(async () => apiSuccess(buildUser(memberships)))
  const utils = renderWithProviders(
    <WorkSpaceDropdown currentSlug={currentSlug} />,
  )
  return utils
}

const trigger = () => screen.getByRole('button')

async function openMenu(
  user: Awaited<ReturnType<typeof renderDropdown>>['user'],
) {
  await user.click(trigger())
  return within(await screen.findByRole('menu'))
}

beforeEach(() => {
  push.mockReset()
  useSession.mockReturnValue({
    data: { user: { id: 'user-1' } },
    isPending: false,
  })
})

describe('<WorkSpaceDropdown /> trigger', () => {
  it('waits for the memberships before naming a workspace', async () => {
    await renderDropdown()

    expect(trigger()).toHaveTextContent('Selecionar workspace')
    expect(trigger()).toHaveTextContent('?')
  })

  it('names the workspace the viewer is in', async () => {
    await renderDropdown()

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(trigger()).toHaveTextContent('A')
  })

  it('falls back when the current slug matches no membership', async () => {
    const { user } = await renderDropdown([ACME], 'unknown')

    // The memberships have landed — the list holds Acme — but none of them
    // is the workspace the url names.
    const menu = await openMenu(user)
    expect(await menu.findByText('Acme')).toBeInTheDocument()
    expect(trigger()).toHaveTextContent('Selecionar workspace')
    expect(trigger()).toHaveTextContent('?')
  })
})

describe('<WorkSpaceDropdown /> menu', () => {
  it('shows the signed-in email as a disabled row', async () => {
    const { user } = await renderDropdown()
    await screen.findByText('Acme')

    const menu = await openMenu(user)

    expect(menu.getByText('ana@nexo.dev')).toBeInTheDocument()
  })

  it('lists every workspace with its role', async () => {
    const { user } = await renderDropdown()
    await screen.findByText('Acme')

    const menu = await openMenu(user)

    expect(
      menu.getAllByRole('menuitemradio').map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Acme'),
      expect.stringContaining('Globex'),
    ])
    expect(menu.getByText('Owner')).toBeInTheDocument()
    expect(menu.getByText('Member')).toBeInTheDocument()
  })

  it('marks the workspace currently open', async () => {
    const { user } = await renderDropdown([ACME, GLOBEX], 'globex')
    await screen.findByText('Globex')

    const menu = await openMenu(user)
    const current = menu
      .getAllByRole('menuitemradio')
      .find((item) => item.getAttribute('aria-checked') === 'true')

    expect(current).toHaveTextContent('Globex')
  })

  it('offers no workspace list while the viewer has none', async () => {
    const { user } = await renderDropdown([])
    await screen.findByText('Selecionar workspace')

    const menu = await openMenu(user)

    expect(menu.queryAllByRole('menuitemradio')).toHaveLength(0)
    expect(
      menu.getByRole('menuitem', { name: 'Criar workspace' }),
    ).toBeInTheDocument()
  })

  it('links to workspace creation and to the member invites', async () => {
    const { user } = await renderDropdown()
    await screen.findByText('Acme')

    const menu = await openMenu(user)

    expect(
      menu.getByRole('menuitem', { name: 'Criar workspace' }),
    ).toHaveAttribute('href', '/create-workspace')
    expect(
      menu.getByRole('menuitem', { name: 'Convidar para workspace' }),
    ).toHaveAttribute('href', '/acme/settings/members')
  })
})

describe('<WorkSpaceDropdown /> switching', () => {
  it('goes to the workspace that was picked', async () => {
    const { user } = await renderDropdown()
    await screen.findByText('Acme')

    const menu = await openMenu(user)
    await user.click(
      menu
        .getAllByRole('menuitemradio')
        .find((item) => item.textContent?.includes('Globex')) as HTMLElement,
    )

    expect(push).toHaveBeenCalledWith('/globex')
  })

  it('stays put when the workspace already open is picked', async () => {
    const { user } = await renderDropdown()
    await screen.findByText('Acme')

    const menu = await openMenu(user)
    await user.click(
      menu
        .getAllByRole('menuitemradio')
        .find((item) => item.textContent?.includes('Acme')) as HTMLElement,
    )

    expect(push).not.toHaveBeenCalled()
  })

  it("opens another workspace's settings without switching to it", async () => {
    const { user } = await renderDropdown()
    await screen.findByText('Acme')

    const menu = await openMenu(user)
    const settings = menu.getByRole('menuitem', {
      name: 'Configurações de Globex',
    })
    expect(settings).toHaveAttribute('href', '/globex/settings')

    // The link is a sibling of the radio item now, not inside it: following
    // it must not also fire the radio group's switch.
    await user.click(settings)

    expect(push).not.toHaveBeenCalled()
  })
})
