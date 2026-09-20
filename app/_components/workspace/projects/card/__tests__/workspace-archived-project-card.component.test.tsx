import { screen, waitFor } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ArchivedProjectCard } from '../workspace-archived-project-card'

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

// next/image needs the Next runtime loader; a plain <img> is enough here.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_URL = `/api/workspaces/${WORKSPACE_ID}/projects/alpha`

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Alpha',
    slug: 'alpha',
    identifier: 'ALP',
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
    archivedAt: '2026-02-20T12:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderCard(overrides: Partial<ProjectDTO> = {}) {
  return renderWithProviders(
    <ArchivedProjectCard
      project={buildProject(overrides)}
      workspaceId={WORKSPACE_ID}
    />,
  )
}

const restoreButton = () =>
  screen.getByRole('button', { name: 'Restaurar projeto' })
const deleteButton = () =>
  screen.getByRole('button', { name: 'Excluir projeto permanentemente' })

describe('<ArchivedProjectCard /> content', () => {
  it('identifies the project by name and slug', () => {
    renderCard()

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
  })

  it('stands in for a missing description', () => {
    renderCard()

    expect(screen.getByText('Sem descrição')).toBeInTheDocument()
  })

  it('shows the description when there is one', () => {
    renderCard({ description: 'Planejamento do trimestre' })

    expect(screen.getByText('Planejamento do trimestre')).toBeInTheDocument()
    expect(screen.queryByText('Sem descrição')).not.toBeInTheDocument()
  })

  it('shows the cover image when the project has one', () => {
    renderCard({ coverImage: '/coverImages/alpha.jpg' })

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      '/coverImages/alpha.jpg',
    )
  })

  it('falls back to a plain header without a cover', () => {
    renderCard()

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
  })

  it('dates the archive in pt-BR', () => {
    renderCard()

    expect(screen.getByText(/Arquivado em/)).toHaveTextContent(
      /20 de fev\.? de 2026/,
    )
  })

  it('says nothing about a date the project does not have', () => {
    renderCard({ archivedAt: null })

    expect(screen.queryByText(/Arquivado em/)).not.toBeInTheDocument()
  })
})

describe('<ArchivedProjectCard /> restoring', () => {
  it('restores the project and confirms it', async () => {
    const fetchSpy = mockFetch().mockImplementation(async () =>
      apiSuccess(buildProject()),
    )
    const { user } = renderCard()

    await user.click(restoreButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${PROJECT_URL}/restore`,
      method: 'PATCH',
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Projeto restaurado'),
    )
  })

  it('reports a failed restore', async () => {
    mockFetch().mockImplementation(async () => apiError(403, 'Sem permissão'))
    const { user } = renderCard()

    await user.click(restoreButton())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Sem permissão'),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('blocks the button while the restore is in flight', async () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { user } = renderCard()

    await user.click(restoreButton())

    await waitFor(() => expect(restoreButton()).toBeDisabled())
    deferred.resolve(apiSuccess(buildProject()))
    await waitFor(() => expect(restoreButton()).toBeEnabled())
  })
})

describe('<ArchivedProjectCard /> deleting', () => {
  it('deletes the project for good and confirms it', async () => {
    // A DELETE answers 204 with no body at all.
    const fetchSpy = mockFetch().mockImplementation(
      async () => new Response(null, { status: 204 }),
    )
    const { user } = renderCard()

    await user.click(deleteButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: PROJECT_URL,
      method: 'DELETE',
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Projeto excluído'),
    )
  })

  it('reports a failed delete', async () => {
    mockFetch().mockImplementation(async () =>
      apiError(409, 'Projeto não pode ser excluído'),
    )
    const { user } = renderCard()

    await user.click(deleteButton())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Projeto não pode ser excluído'),
    )
  })

  it('blocks the button while the delete is in flight', async () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { user } = renderCard()

    await user.click(deleteButton())

    await waitFor(() => expect(deleteButton()).toBeDisabled())
    deferred.resolve(new Response(null, { status: 204 }))
    await waitFor(() => expect(deleteButton()).toBeEnabled())
  })
})
