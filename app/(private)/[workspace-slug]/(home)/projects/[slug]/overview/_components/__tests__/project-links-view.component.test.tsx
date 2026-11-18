import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectLinkDTO } from '@/types/project-link'
import { ProjectLinksView } from '../project-links-view'

// Real sonner attaches its own handlers to the tracked promise; the stub does
// the same so a rejected mutation never surfaces as an unhandled rejection.
vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

const BASE = '/api/workspaces/ws-1/projects/alpha/links'

const links: ProjectLinkDTO[] = [
  {
    id: 'l1',
    projectId: 'p1',
    title: 'Site',
    url: 'https://nexopm.com',
    createdById: 'u1',
    createdAt: '2026-11-17T10:00:00.000Z',
  },
  {
    id: 'l2',
    projectId: 'p1',
    title: null,
    url: 'https://docs.nexopm.com',
    createdById: 'u1',
    createdAt: '2026-11-17T11:00:00.000Z',
  },
]

// GET answers the list; every other method succeeds with an empty body.
function mockApi(list: ProjectLinkDTO[] = links) {
  return mockFetch().mockImplementation(async (_input, init) =>
    !init?.method || init.method === 'GET'
      ? apiSuccess(list)
      : apiSuccess(null),
  )
}

function findCall(fetchSpy: ReturnType<typeof mockFetch>, method: string) {
  const index = fetchSpy.mock.calls.findIndex(
    ([, init]) => init?.method === method,
  )
  return index < 0 ? undefined : getFetchCall(fetchSpy, index)
}

function renderView(canManage = true) {
  return renderWithProviders(
    <ProjectLinksView
      workspaceId='ws-1'
      projectSlug='alpha'
      canManage={canManage}
    />,
  )
}

describe('<ProjectLinksView />', () => {
  it('renders nothing while the project has no links', async () => {
    const fetchSpy = mockApi([])
    renderView()

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    expect(screen.queryByText('Links')).not.toBeInTheDocument()
  })

  it('lists the links with the count and safe external anchors', async () => {
    mockApi()
    renderView()

    expect(await screen.findByText('Links')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    const anchor = screen.getByRole('link', { name: 'https://nexopm.com' })
    expect(anchor).toHaveAttribute('href', 'https://nexopm.com')
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText(/Site/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'https://docs.nexopm.com' }),
    ).toBeInTheDocument()
  })

  it('offers edit and remove to a manager', async () => {
    mockApi()
    renderView(true)

    await screen.findByText('Links')

    expect(screen.getAllByRole('button', { name: 'Editar link' })).toHaveLength(
      2,
    )
    expect(screen.getAllByRole('button', { name: 'Copiar link' })).toHaveLength(
      2,
    )
    expect(
      screen.getAllByRole('button', { name: 'Remover link' }),
    ).toHaveLength(2)
  })

  it('keeps only copy for someone who cannot manage', async () => {
    mockApi()
    renderView(false)

    await screen.findByText('Links')

    expect(screen.getAllByRole('button', { name: 'Copiar link' })).toHaveLength(
      2,
    )
    expect(
      screen.queryByRole('button', { name: 'Editar link' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remover link' }),
    ).not.toBeInTheDocument()
  })

  it('copies the url to the clipboard', async () => {
    mockApi()
    const { user } = renderView()
    // userEvent.setup() installs its own clipboard stub, so the spy is taken
    // after the render.
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    await screen.findByText('Links')
    await user.click(screen.getAllByRole('button', { name: 'Copiar link' })[0])

    expect(writeText).toHaveBeenCalledWith('https://nexopm.com')
  })

  it('opens the edit dialog filled with the chosen link', async () => {
    mockApi()
    const { user } = renderView()

    await screen.findByText('Links')
    await user.click(screen.getAllByRole('button', { name: 'Editar link' })[0])

    expect(await screen.findByText('Edite o link')).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toHaveValue('https://nexopm.com')
    expect(screen.getByLabelText('Título')).toHaveValue('Site')
  })

  it('removes a link only after the confirmation', async () => {
    const fetchSpy = mockApi()
    const { user } = renderView()

    await screen.findByText('Links')
    await user.click(screen.getAllByRole('button', { name: 'Remover link' })[0])

    expect(findCall(fetchSpy, 'DELETE')).toBeUndefined()

    await user.click(await screen.findByRole('button', { name: 'Remover' }))

    await waitFor(() => expect(findCall(fetchSpy, 'DELETE')).toBeDefined())
    expect(findCall(fetchSpy, 'DELETE')).toMatchObject({
      url: `${BASE}/l1`,
      method: 'DELETE',
    })
  })
})
