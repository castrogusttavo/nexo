import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WikiPageDTO } from '@/types/wiki-page'
import { WikiSidebarTree } from '../wiki-sidebar-tree'

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => '/acme'),
}))
vi.mock('next/navigation', () => ({ usePathname }))

const WORKSPACE_ID = 'ws-1'
const WIKI_URL = `/api/workspaces/${WORKSPACE_ID}/wiki`

function buildPage(overrides: Partial<WikiPageDTO> = {}): WikiPageDTO {
  return {
    id: 'page-1',
    workspaceId: WORKSPACE_ID,
    parentId: null,
    title: 'Manual',
    icon: null,
    coverImage: null,
    content: [],
    position: 0,
    createdById: 'user-1',
    updatedById: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderTree(pages: WikiPageDTO[]) {
  // A `Response` body can only be read once, so every call gets a fresh one.
  const fetchSpy = mockFetch().mockImplementation(async () => apiSuccess(pages))
  return {
    fetchSpy,
    ...renderWithProviders(
      <WikiSidebarTree workspaceId={WORKSPACE_ID} workspaceSlug='acme' />,
    ),
  }
}

const pageLink = (name: string) => screen.getByRole('link', { name })

/** The row's "..." menu is an unlabelled trigger next to the page link. */
function rowMenuTrigger(name: string) {
  const trigger = pageLink(name).parentElement?.querySelector('[aria-haspopup]')
  if (!(trigger instanceof HTMLElement)) throw new Error('No row menu trigger')
  return trigger
}

/** The nesting depth the item renders as left padding. */
function indentOf(name: string) {
  const button = within(pageLink(name)).getByRole('button')
  return button.style.paddingLeft
}

describe('<WikiSidebarTree /> states', () => {
  it('renders nothing while the pages load', () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { container } = renderWithProviders(
      <WikiSidebarTree workspaceId={WORKSPACE_ID} workspaceSlug='acme' />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Nenhuma página ainda.')).not.toBeInTheDocument()

    deferred.resolve(apiSuccess([]))
  })

  it('invites the first page when the workspace has none', async () => {
    renderTree([])

    expect(await screen.findByText('Nenhuma página ainda.')).toBeInTheDocument()
  })

  it('falls back to "Sem título" for an untitled page', async () => {
    renderTree([buildPage({ title: '' })])

    expect(await screen.findByText('Sem título')).toBeInTheDocument()
  })

  it('links each page to its workspace route', async () => {
    renderTree([buildPage()])

    expect(await screen.findByRole('link', { name: 'Manual' })).toHaveAttribute(
      'href',
      '/acme/wiki/page-1',
    )
  })
})

describe('<WikiSidebarTree /> tree building', () => {
  const NESTED = [
    buildPage({ id: 'root', title: 'Raiz' }),
    buildPage({ id: 'child', title: 'Filha', parentId: 'root' }),
    buildPage({ id: 'grandchild', title: 'Neta', parentId: 'child' }),
    buildPage({ id: 'other', title: 'Outra' }),
  ]

  it('nests each page under its parent, one indent level per depth', async () => {
    renderTree(NESTED)
    await screen.findByRole('link', { name: 'Raiz' })

    expect(indentOf('Raiz')).toBe('10px')
    expect(indentOf('Filha')).toBe('22px')
    expect(indentOf('Neta')).toBe('34px')
  })

  it('keeps a child inside its parent subtree', async () => {
    renderTree(NESTED)
    const root = await screen.findByRole('link', { name: 'Raiz' })
    const subtree = root.parentElement?.parentElement

    expect(subtree).not.toBeNull()
    expect(
      within(subtree as HTMLElement).getByRole('link', { name: 'Neta' }),
    ).toBeInTheDocument()
    expect(
      within(subtree as HTMLElement).queryByRole('link', { name: 'Outra' }),
    ).not.toBeInTheDocument()
  })

  it('promotes a page whose parent is missing to a root', async () => {
    renderTree([buildPage({ id: 'orphan', title: 'Órfã', parentId: 'gone' })])

    const orphan = await screen.findByRole('link', { name: 'Órfã' })
    expect(within(orphan).getByRole('button').style.paddingLeft).toBe('10px')
  })
})

describe('<WikiSidebarTree /> current page', () => {
  it('sets the open page apart from the others', async () => {
    usePathname.mockReturnValue('/acme/wiki/page-2')
    renderTree([buildPage(), buildPage({ id: 'page-2', title: 'Arquitetura' })])
    await screen.findByRole('link', { name: 'Manual' })

    const active = within(pageLink('Arquitetura')).getByRole('button')
    const inactive = within(pageLink('Manual')).getByRole('button')

    expect(active.className).not.toBe(inactive.className)
  })
})

describe('<WikiSidebarTree /> archiving', () => {
  it('archives the page from its row menu', async () => {
    const { fetchSpy, user } = renderTree([buildPage()])
    await screen.findByRole('link', { name: 'Manual' })

    await user.click(rowMenuTrigger('Manual'))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Arquivar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(getFetchCall(fetchSpy, 1)).toMatchObject({
      url: `${WIKI_URL}/page-1/archive`,
      method: 'PATCH',
    })
  })

  it('drops the archived page and its descendants from the tree', async () => {
    const { user } = renderTree([
      buildPage({ id: 'root', title: 'Raiz' }),
      buildPage({ id: 'child', title: 'Filha', parentId: 'root' }),
      buildPage({ id: 'grandchild', title: 'Neta', parentId: 'child' }),
      buildPage({ id: 'other', title: 'Outra' }),
    ])
    await screen.findByRole('link', { name: 'Raiz' })

    await user.click(rowMenuTrigger('Raiz'))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Arquivar' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Raiz' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('link', { name: 'Filha' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Neta' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Outra' })).toBeInTheDocument()
  })
})
