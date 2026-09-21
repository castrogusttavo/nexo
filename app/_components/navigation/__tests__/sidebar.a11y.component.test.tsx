import {
  Home03Icon,
  PanelLeftIcon,
  PencilEdit01Icon,
  WorkIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  createTestQueryClient,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import {
  ContextHeader,
  ContextPrimaryAction,
  ContextSidebar,
  NavGroup,
  NavGroupAccordion,
  NavItem,
} from '../sidebar-context'
import { GlobalSidebarNavigation } from '../sidebar-global'
import { SidebarProjects } from '../sidebar-project/sidebar-projects'

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname,
  useRouter: () => ({ push: vi.fn() }),
}))

const WORKSPACE_ID = 'ws-1'

function buildProject(overrides: Partial<ProjectDTO>): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Plataforma',
    slug: 'plataforma',
    identifier: 'PLA',
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: WORKSPACE_ID,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * Both sidebars of the workspace home, built from the same pieces its layout
 * uses: the global rail, the context header, plain nav items, a collapsible
 * group, and the project tree (with a favourite, so both groups render).
 */
function renderSidebars() {
  usePathname.mockReturnValue('/acme')
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(
    [['projects'], WORKSPACE_ID, { archived: false }],
    [
      buildProject({}),
      buildProject({
        id: 'project-2',
        name: 'Design System',
        slug: 'design-system',
        isFavorited: true,
      }),
    ],
  )
  return renderWithProviders(
    <div className='flex'>
      <GlobalSidebarNavigation slug='acme' />
      <ContextSidebar>
        <ContextHeader
          title='Projetos'
          actions={
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='Recolher barra lateral'
            >
              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            </Button>
          }
          primaryAction={
            <ContextPrimaryAction>Nova issue</ContextPrimaryAction>
          }
        />
        <NavGroup>
          <NavItem href='/acme' icon={Home03Icon}>
            Página inicial
          </NavItem>
          <NavItem href='/acme/drafts' icon={PencilEdit01Icon}>
            Rascunhos
          </NavItem>
        </NavGroup>
        <NavGroupAccordion label='Espaço de trabalho'>
          <NavItem href='/acme/projects' icon={WorkIcon}>
            Projetos
          </NavItem>
        </NavGroupAccordion>
        <SidebarProjects workspaceId={WORKSPACE_ID} base='/acme' />
      </ContextSidebar>
    </div>,
    { queryClient },
  )
}

/** Every control inside a link, and every link inside a control. */
function nestedControls(root: ParentNode) {
  const control = 'button, [role="button"], [role="menuitem"], input'
  return [
    ...root.querySelectorAll(
      control
        .split(', ')
        .map((selector) => `a ${selector}`)
        .join(', '),
    ),
    ...root.querySelectorAll(
      control
        .split(', ')
        .flatMap((selector) => [`${selector} a`, `${selector} button`])
        .join(', '),
    ),
  ]
}

beforeEach(() => {
  usePathname.mockReset()
})

describe('workspace sidebars accessibility', () => {
  it('has no axe violations with every group and project row expanded', async () => {
    const { container, user } = renderSidebars()

    await user.click(screen.getByRole('button', { name: 'Favoritos' }))
    await user.click(screen.getByRole('button', { name: 'Plataforma' }))
    await screen.findByRole('link', { name: 'Visão geral' })

    await expectNoA11yViolations(container, { disabledRules: ['region'] })
  })

  it('nests no control inside another (axe nested-interactive)', async () => {
    const { container, user } = renderSidebars()
    await user.click(screen.getByRole('button', { name: 'Plataforma' }))
    await screen.findByRole('link', { name: 'Visão geral' })

    // axe's nested-interactive only inspects roles whose children are
    // presentational (a button holding a link), not a link holding a button,
    // so the DOM is asserted in both directions as well.
    expect(nestedControls(container)).toEqual([])
    await expectNoA11yViolations(container, {
      runOnly: { type: 'rule', values: ['nested-interactive'] },
    })
  })

  it.each([
    ['Página inicial', '/acme'],
    ['Rascunhos', '/acme/drafts'],
    ['Projetos', '/acme'],
    ['Wiki', '/acme/wiki'],
    ['Ajustes', '/acme/settings'],
  ])('"%s" is a single link to %s', (name, href) => {
    renderSidebars()

    const links = screen
      .getAllByRole('link', { name })
      .filter((link) => link.getAttribute('href') === href)
    expect(links).toHaveLength(1)
    expect(within(links[0]).queryByRole('button')).not.toBeInTheDocument()
  })

  it('marks the current page on the nav item itself', () => {
    renderSidebars()

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent)
    // The global rail's "Projetos" section and the home item.
    expect(current).toEqual(['Projetos', 'Página inicial'])
  })

  it('keeps the row menu and the new-project action outside the triggers', () => {
    renderSidebars()

    const rowMenu = screen.getByRole('button', {
      name: 'Opções do projeto Plataforma',
    })
    const row = screen.getByRole('button', { name: 'Plataforma' })
    expect(row).not.toContainElement(rowMenu)

    const create = screen.getByRole('button', { name: 'Novo projeto' })
    const group = screen.getByRole('button', { name: 'Projetos' })
    expect(group).not.toContainElement(create)
  })
})
