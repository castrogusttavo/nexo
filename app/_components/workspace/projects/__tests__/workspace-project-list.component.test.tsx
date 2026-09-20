import { screen, waitFor } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  deferredResponse,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ProjectList } from '../workspace-project-list'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession },
}))

const SIGNED_IN_USER = 'user-1'

beforeEach(() => {
  useSession.mockReturnValue({
    data: { user: { id: SIGNED_IN_USER } },
    isPending: false,
  })
})

// The card is a route-aware surface of its own (next/image, tooltips, the
// member cache query); the list only owns filtering, sorting and the states
// around them, so the card is stubbed down to its title.
vi.mock('../card/workspace-project-card', () => ({
  ProjectCard: ({
    project,
    workspaceSlug,
    workspaceId,
  }: {
    project: ProjectDTO
    workspaceSlug: string
    workspaceId: string
  }) => (
    <article data-testid='project-card' data-workspace={workspaceId}>
      <a href={`/${workspaceSlug}/projects/${project.slug}`}>{project.name}</a>
    </article>
  ),
}))

const WORKSPACE_ID = 'ws-1'

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
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * `parseAsIsoDate` keeps only the `YYYY-MM-DD` part, and the list reads that
 * day as a calendar day: it runs from local midnight to the last local
 * millisecond, whatever the viewer's timezone.
 */
function rangeBounds(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  const from = new Date(year, month - 1, date)
  const end = new Date(year, month - 1, date, 23, 59, 59, 999)
  return { from, end }
}

function at(date: Date, offsetMs: number) {
  return new Date(date.getTime() + offsetMs).toISOString()
}

function daysAgo(days: number, hour = 12) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

async function renderList(
  projects: ProjectDTO[],
  searchParams?: Record<string, string>,
) {
  mockFetch().mockResolvedValue(apiSuccess(projects))
  const utils = renderWithProviders(
    <ProjectList workspaceId={WORKSPACE_ID} workspaceSlug='acme' />,
    { searchParams },
  )
  await waitFor(() =>
    expect(screen.queryByTestId('skeletons')).not.toBeInTheDocument(),
  )
  return utils
}

const cardNames = () =>
  screen.queryAllByTestId('project-card').map((card) => card.textContent)

describe('<ProjectList /> states', () => {
  it('shows three skeletons while the projects load', async () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { container } = renderWithProviders(
      <ProjectList workspaceId={WORKSPACE_ID} workspaceSlug='acme' />,
    )

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)

    deferred.resolve(apiSuccess([buildProject()]))
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
  })

  it('explains a failed load', async () => {
    mockFetch().mockResolvedValueOnce(Response.json({}, { status: 500 }))
    renderWithProviders(
      <ProjectList workspaceId={WORKSPACE_ID} workspaceSlug='acme' />,
    )

    expect(
      await screen.findByText(
        'Não foi possível carregar os projetos. Tente novamente.',
      ),
    ).toBeInTheDocument()
  })

  it('invites the first project when the workspace has none', async () => {
    await renderList([])

    expect(
      await screen.findByText(
        'Nenhum projeto encontrado. Crie seu primeiro projeto.',
      ),
    ).toBeInTheDocument()
  })

  it('distinguishes an empty result from an over-filtered one', async () => {
    await renderList([buildProject({ isPublic: false })], {
      access: 'public',
    })

    expect(
      await screen.findByText('Nenhum projeto corresponde aos filtros.'),
    ).toBeInTheDocument()
  })

  it('passes the workspace and slug down to each card', async () => {
    await renderList([buildProject()])

    const card = await screen.findByTestId('project-card')
    expect(card).toHaveAttribute('data-workspace', WORKSPACE_ID)
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute(
      'href',
      '/acme/projects/alpha',
    )
  })
})

describe('<ProjectList /> sorting', () => {
  const projects = [
    buildProject({
      id: 'p-1',
      name: 'Beta',
      slug: 'beta',
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
    buildProject({
      id: 'p-2',
      name: 'Áurea',
      slug: 'aurea',
      createdAt: '2026-03-01T00:00:00.000Z',
    }),
    buildProject({
      id: 'p-3',
      name: 'Carla',
      slug: 'carla',
      createdAt: '2026-02-01T00:00:00.000Z',
    }),
  ]

  it('defaults to the newest project first', async () => {
    await renderList(projects)

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Áurea', 'Carla', 'Beta'])
  })

  it('sorts by creation date ascending when asked', async () => {
    await renderList(projects, { sortOrder: 'asc' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Beta', 'Carla', 'Áurea'])
  })

  it('sorts by name with pt-BR collation', async () => {
    await renderList(projects, { sortField: 'name', sortOrder: 'asc' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Áurea', 'Beta', 'Carla'])
  })

  it('reverses the name order on desc', async () => {
    await renderList(projects, { sortField: 'name', sortOrder: 'desc' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Carla', 'Beta', 'Áurea'])
  })
})

describe('<ProjectList /> filters', () => {
  const publicProject = buildProject({
    id: 'p-pub',
    name: 'Público',
    slug: 'publico',
    isPublic: true,
  })
  const privateProject = buildProject({
    id: 'p-priv',
    name: 'Privado',
    slug: 'privado',
    isPublic: false,
  })

  it('keeps only the public projects', async () => {
    await renderList([publicProject, privateProject], { access: 'public' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Público'])
  })

  it('keeps only the private projects', async () => {
    await renderList([publicProject, privateProject], { access: 'private' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Privado'])
  })

  it('keeps both when both accesses are selected', async () => {
    await renderList([publicProject, privateProject], {
      access: 'public,private',
      sortField: 'name',
      sortOrder: 'asc',
    })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Privado', 'Público'])
  })

  it('keeps only the projects the signed-in user leads', async () => {
    await renderList(
      [
        publicProject,
        buildProject({
          id: 'p-other',
          name: 'De outra pessoa',
          slug: 'de-outra-pessoa',
          leadId: 'user-2',
        }),
      ],
      { mine: 'true', sortField: 'name', sortOrder: 'asc' },
    )

    await waitFor(() => expect(cardNames()).toEqual(['Público']))
  })

  // Deleting a user nulls the lead rather than the project. Nobody leads it,
  // so it can never be claimed as "mine" by whoever is looking.
  it('never claims a project whose lead was deleted', async () => {
    await renderList(
      [
        publicProject,
        buildProject({
          id: 'p-orphan',
          name: 'Sem líder',
          slug: 'sem-lider',
          leadId: null,
        }),
      ],
      { mine: 'true', sortField: 'name', sortOrder: 'asc' },
    )

    await waitFor(() => expect(cardNames()).toEqual(['Público']))
  })

  it('claims nothing while the session is still loading', async () => {
    useSession.mockReturnValue({ data: null, isPending: true })
    await renderList([publicProject, privateProject], { mine: 'true' })

    expect(
      await screen.findByText('Nenhum projeto corresponde aos filtros.'),
    ).toBeInTheDocument()
  })

  const dated = [
    buildProject({
      id: 'd-today',
      name: 'Hoje',
      slug: 'hoje',
      createdAt: daysAgo(0),
    }),
    buildProject({
      id: 'd-yesterday',
      name: 'Ontem',
      slug: 'ontem',
      createdAt: daysAgo(1),
    }),
    buildProject({
      id: 'd-week',
      name: 'Semana',
      slug: 'semana',
      createdAt: daysAgo(4),
    }),
    buildProject({
      id: 'd-month',
      name: 'Mês',
      slug: 'mes',
      createdAt: daysAgo(20),
    }),
    buildProject({
      id: 'd-old',
      name: 'Antigo',
      slug: 'antigo',
      createdAt: daysAgo(90),
    }),
  ]

  it('keeps the projects created today', async () => {
    await renderList(dated, { createdAt: 'today' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Hoje'])
  })

  it('keeps the projects created yesterday', async () => {
    await renderList(dated, { createdAt: 'yesterday' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Ontem'])
  })

  it('keeps the last seven days', async () => {
    await renderList(dated, { createdAt: '7days' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Hoje', 'Ontem', 'Semana'])
  })

  it('keeps the last thirty days', async () => {
    await renderList(dated, { createdAt: '30days' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Hoje', 'Ontem', 'Semana', 'Mês'])
  })

  it('takes a single day as the whole day when only "from" is set', async () => {
    const { from, end } = rangeBounds('2026-03-10')
    const projects = [
      buildProject({
        id: 'before',
        name: 'Antes',
        slug: 'antes',
        createdAt: at(from, -1000),
      }),
      buildProject({
        id: 'start',
        name: 'Início',
        slug: 'inicio',
        createdAt: at(from, 0),
      }),
      buildProject({
        id: 'end',
        name: 'Fim',
        slug: 'fim',
        createdAt: at(end, 0),
      }),
      buildProject({
        id: 'after',
        name: 'Depois',
        slug: 'depois',
        createdAt: at(end, 1000),
      }),
    ]

    await renderList(projects, { dateFrom: '2026-03-10', sortOrder: 'asc' })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Início', 'Fim'])
  })

  it('takes the inclusive range when both ends are set', async () => {
    const { from } = rangeBounds('2026-03-10')
    const { end } = rangeBounds('2026-03-12')
    const projects = [
      buildProject({
        id: 'before',
        name: 'Antes',
        slug: 'antes',
        createdAt: at(from, -1000),
      }),
      buildProject({
        id: 'inside',
        name: 'Dentro',
        slug: 'dentro',
        createdAt: at(from, 36 * 3_600_000),
      }),
      buildProject({
        id: 'last-day',
        name: 'Último dia',
        slug: 'ultimo-dia',
        createdAt: at(end, 0),
      }),
      buildProject({
        id: 'after',
        name: 'Depois',
        slug: 'depois',
        createdAt: at(end, 1000),
      }),
    ]

    await renderList(projects, {
      dateFrom: '2026-03-10',
      dateTo: '2026-03-12',
      sortOrder: 'asc',
    })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['Dentro', 'Último dia'])
  })

  it('lets an explicit range win over the createdAt preset', async () => {
    const { from } = rangeBounds('2026-03-10')
    const projects = [
      buildProject({
        id: 'ranged',
        name: 'No intervalo',
        slug: 'no-intervalo',
        createdAt: at(from, 3_600_000),
      }),
      buildProject({
        id: 'today',
        name: 'Hoje',
        slug: 'hoje',
        createdAt: daysAgo(0),
      }),
    ]

    await renderList(projects, {
      createdAt: 'today',
      dateFrom: '2026-03-10',
    })

    await screen.findAllByTestId('project-card')
    expect(cardNames()).toEqual(['No intervalo'])
  })
})

describe('<ProjectList /> date range across timezones', () => {
  const ORIGINAL_TZ = process.env.TZ

  beforeEach(() => {
    // UTC-3: the local day only starts three hours after UTC midnight, the
    // instant `parseAsIsoDate` hands the picked day over as.
    process.env.TZ = 'America/Sao_Paulo'
  })

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ
  })

  it('opens the range at local midnight, not at UTC midnight', async () => {
    const projects = [
      buildProject({
        id: 'eve',
        name: 'Véspera',
        slug: 'vespera',
        // 2026-03-09 23:00 local — the evening before the picked day.
        createdAt: '2026-03-10T02:00:00.000Z',
      }),
      buildProject({
        id: 'dawn',
        name: 'Madrugada',
        slug: 'madrugada',
        // 2026-03-10 00:00 local.
        createdAt: '2026-03-10T03:00:00.000Z',
      }),
      buildProject({
        id: 'night',
        name: 'Noite',
        slug: 'noite',
        // 2026-03-10 23:59 local.
        createdAt: '2026-03-11T02:59:00.000Z',
      }),
      buildProject({
        id: 'next',
        name: 'Dia seguinte',
        slug: 'dia-seguinte',
        // 2026-03-11 00:00 local.
        createdAt: '2026-03-11T03:00:00.000Z',
      }),
    ]

    await renderList(projects, { dateFrom: '2026-03-10', sortOrder: 'asc' })

    await waitFor(() => expect(cardNames()).toEqual(['Madrugada', 'Noite']))
  })
})
