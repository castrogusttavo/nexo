import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectAttachmentDTO } from '@/types/project-attachment'
import { ProjectAttachmentsView } from '../project-attachments-view'

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

const BASE = '/api/workspaces/ws-1/projects/alpha/attachments'

const attachments: ProjectAttachmentDTO[] = [
  {
    id: 'a1',
    projectId: 'p1',
    fileName: 'plano.pdf',
    contentType: 'application/pdf',
    size: 1536,
    url: 'https://signed/plano',
    uploadedById: 'u1',
    createdAt: '2026-11-18T10:00:00.000Z',
  },
  {
    id: 'a2',
    projectId: 'p1',
    fileName: 'demo.mp4',
    contentType: 'video/mp4',
    size: 5 * 1024 * 1024,
    url: 'https://signed/demo',
    uploadedById: 'u1',
    createdAt: '2026-11-18T11:00:00.000Z',
  },
]

// GET answers the list; every other method succeeds with an empty body.
function mockApi(list: ProjectAttachmentDTO[] = attachments) {
  return mockFetch().mockImplementation(async (_input, init) =>
    !init?.method || init.method === 'GET'
      ? apiSuccess(list)
      : apiSuccess(null),
  )
}

function renderView(canManage = true) {
  return renderWithProviders(
    <ProjectAttachmentsView
      workspaceId='ws-1'
      projectSlug='alpha'
      canManage={canManage}
    />,
  )
}

describe('<ProjectAttachmentsView />', () => {
  it('renders nothing while the project has no attachments', async () => {
    const fetchSpy = mockApi([])
    renderView()

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    expect(screen.queryByText('Anexos')).not.toBeInTheDocument()
  })

  it('lists the files with count, readable size and a download link', async () => {
    mockApi()
    renderView()

    expect(await screen.findByText('Anexos')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1,5 KB')).toBeInTheDocument()
    expect(screen.getByText('5 MB')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'plano.pdf' })
    expect(link).toHaveAttribute('href', 'https://signed/plano')
    // A download, not a new tab: the signed URL carries the disposition.
    expect(link).toHaveAttribute('download', 'plano.pdf')
    expect(link).not.toHaveAttribute('target')
  })

  it('offers remove only to someone who can manage', async () => {
    mockApi()
    const { unmount } = renderView(true)
    await screen.findByText('Anexos')
    expect(
      screen.getAllByRole('button', { name: 'Remover anexo' }),
    ).toHaveLength(2)
    unmount()

    mockApi()
    renderView(false)
    await screen.findByText('Anexos')
    expect(
      screen.queryByRole('button', { name: 'Remover anexo' }),
    ).not.toBeInTheDocument()
  })

  it('removes a file only after the confirmation', async () => {
    const fetchSpy = mockApi()
    const { user } = renderView()

    await screen.findByText('Anexos')
    await user.click(
      screen.getAllByRole('button', { name: 'Remover anexo' })[0],
    )

    const deletes = () =>
      fetchSpy.mock.calls.findIndex(([, init]) => init?.method === 'DELETE')
    expect(deletes()).toBe(-1)

    await user.click(await screen.findByRole('button', { name: 'Remover' }))

    await waitFor(() => expect(deletes()).toBeGreaterThan(-1))
    expect(getFetchCall(fetchSpy, deletes())).toMatchObject({
      url: `${BASE}/a1`,
      method: 'DELETE',
    })
  })
})
