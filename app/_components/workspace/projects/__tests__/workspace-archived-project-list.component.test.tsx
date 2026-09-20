import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ArchivedProjectList } from '../workspace-archived-project-list'

const WORKSPACE_ID = 'ws-1'

// The card owns its own surface (next/image, tooltips, restore and delete);
// the list only owns sorting and the states around it.
vi.mock('../card/workspace-archived-project-card', () => ({
  ArchivedProjectCard: ({
    project,
    workspaceId,
  }: {
    project: ProjectDTO
    workspaceId: string
  }) => (
    <article data-testid='archived-card' data-workspace={workspaceId}>
      {project.name}
    </article>
  ),
}))

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
    archivedAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderList(searchParams?: Record<string, string>) {
  return renderWithProviders(
    <ArchivedProjectList workspaceId={WORKSPACE_ID} />,
    {
      searchParams,
    },
  )
}

async function renderWith(
  projects: ProjectDTO[],
  searchParams?: Record<string, string>,
) {
  const fetchSpy = mockFetch().mockImplementation(async () =>
    apiSuccess(projects),
  )
  const utils = renderList(searchParams)
  if (projects.length) await screen.findAllByTestId('archived-card')
  return { ...utils, fetchSpy }
}

const cardNames = () =>
  screen.queryAllByTestId('archived-card').map((card) => card.textContent)

const PROJECTS = [
  buildProject({
    id: 'p-1',
    name: 'Beta',
    slug: 'beta',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
  buildProject({
    id: 'p-2',
    name: 'Áurea',
    slug: 'aurea',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }),
  buildProject({
    id: 'p-3',
    name: 'Carla',
    slug: 'carla',
    updatedAt: '2026-02-01T00:00:00.000Z',
  }),
]

describe('<ArchivedProjectList /> states', () => {
  it('asks the api for the archived projects only', async () => {
    const { fetchSpy } = await renderWith([buildProject()])

    expect(getFetchCall(fetchSpy).url).toBe(
      `/api/workspaces/${WORKSPACE_ID}/projects?archived=true`,
    )
  })

  it('shows three skeletons while the projects load', async () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { container } = renderList()

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)

    deferred.resolve(apiSuccess([buildProject()]))
    expect(await screen.findByTestId('archived-card')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
  })

  it('explains a failed load', async () => {
    mockFetch().mockResolvedValueOnce(Response.json({}, { status: 500 }))
    renderList()

    expect(
      await screen.findByText(
        'Não foi possível carregar os projetos arquivados. Tente novamente.',
      ),
    ).toBeInTheDocument()
  })

  it('says so when nothing was archived', async () => {
    mockFetch().mockImplementation(async () => apiSuccess([]))
    renderList()

    expect(
      await screen.findByText('Nenhum projeto arquivado.'),
    ).toBeInTheDocument()
  })

  it('hands the workspace down to each card', async () => {
    await renderWith([buildProject()])

    expect(screen.getByTestId('archived-card')).toHaveAttribute(
      'data-workspace',
      WORKSPACE_ID,
    )
  })
})

describe('<ArchivedProjectList /> sorting', () => {
  it('defaults to the most recently touched project first', async () => {
    await renderWith(PROJECTS)

    await waitFor(() => expect(cardNames()).toEqual(['Áurea', 'Carla', 'Beta']))
  })

  it('reverses to the oldest first', async () => {
    await renderWith(PROJECTS, { sortOrder: 'asc' })

    await waitFor(() => expect(cardNames()).toEqual(['Beta', 'Carla', 'Áurea']))
  })

  it('sorts by name ascending when asked', async () => {
    await renderWith(PROJECTS, { sortField: 'name', sortOrder: 'asc' })

    await waitFor(() => expect(cardNames()).toEqual(['Áurea', 'Beta', 'Carla']))
  })

  it('reverses the name order on desc', async () => {
    await renderWith(PROJECTS, { sortField: 'name', sortOrder: 'desc' })

    await waitFor(() => expect(cardNames()).toEqual(['Carla', 'Beta', 'Áurea']))
  })
})
