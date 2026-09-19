import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing'
import { describe, expect, it, vi } from 'vitest'
import { IssueListView } from '@/app/_components/issue/issue-list-view'
import {
  apiSuccess,
  createTestQueryClient,
  mockFetch,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import type { StateDTO } from '@/types/state'
import { IssuesFilters } from '../filters'

// See issue-list-view.component.test.tsx: the localStorage-backed store
// can't initialise under Node >= 25, so a plain object stands in.
vi.mock('@/components/layouts/use-issue-list-preferences', () => ({
  useIssueListPreferences: () => ({
    preferences: {
      groupBy: 'none',
      sortBy: 'manual',
      showSubIssues: true,
      showEmptyGroups: true,
    },
    update: vi.fn(),
  }),
}))

vi.mock('@/app/_components/issue/panel/issue-details-panel', () => ({
  IssueDetailsPanel: () => null,
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const BASE = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}`

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
    number: 1,
    title: 'Primeira issue',
    description: [],
    priority: 'NONE',
    startDate: null,
    dueDate: null,
    stateId: 'state-todo',
    typeId: 'type-1',
    cycleId: null,
    moduleId: null,
    labelIds: [],
    assigneeIds: [],
    estimateValueId: null,
    authorId: 'user-1',
    projectId: 'project-1',
    parentId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const STATES = [
  {
    id: 'state-todo',
    name: 'A fazer',
    group: 'UNSTARTED',
    order: 0,
    color: 'ZINC',
    isDefault: true,
  },
] as StateDTO[]

const ISSUES = [
  buildIssue({ id: 'i-1', number: 1, title: 'Login', priority: 'HIGH' }),
  buildIssue({ id: 'i-2', number: 2, title: 'Cadastro', priority: 'LOW' }),
]

function mockProjectApi() {
  return mockFetch().mockImplementation(async (input) => {
    const url = String(input)
    if (url.startsWith(`${BASE}/issues`))
      return apiSuccess({ items: ISSUES, nextCursor: null })
    if (url === `${BASE}/states`) return apiSuccess(STATES)
    return apiSuccess([])
  })
}

// The shared helper's adapter has no memory: each URL write would start
// from the initial query string again. The toolbar makes several writes in
// a row (mode, then pql), so it gets an adapter that keeps them, like the
// real router does, plus a spy on what lands in the URL.
function renderToolbar(searchParams?: Record<string, string>) {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>()
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        <IssuesFilters workspaceId={WORKSPACE_ID} projectSlug={PROJECT_SLUG} />
        <IssueListView
          workspaceId={WORKSPACE_ID}
          workspaceSlug='acme'
          projectSlug={PROJECT_SLUG}
          projectIdentifier='NEX'
        />
      </NuqsTestingAdapter>
    </QueryClientProvider>,
  )
  const lastUrl = () => onUrlUpdate.mock.lastCall?.[0].searchParams
  return { user: userEvent.setup(), lastUrl, onUrlUpdate }
}

describe('<IssuesFilters />', () => {
  it('narrows the list when a basic filter is picked', async () => {
    mockProjectApi()
    const { user, lastUrl } = renderToolbar()
    await screen.findByText('Cadastro')

    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar filtro' }))
    await user.click(await screen.findByRole('option', { name: 'Prioridade' }))
    await user.click(await screen.findByRole('button', { name: 'Selecionar' }))
    await user.click(await screen.findByRole('option', { name: 'Alta' }))

    await waitFor(() =>
      expect(screen.queryByText('Cadastro')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(JSON.parse(lastUrl()?.get('filters') ?? '[]')).toEqual([
      expect.objectContaining({
        field: 'priority',
        operator: 'is',
        value: ['HIGH'],
      }),
    ])
    expect(screen.getByRole('button', { name: /Filtrar/ })).toHaveTextContent(
      '1',
    )
  })

  it('narrows the list from a PQL query', async () => {
    mockProjectApi()
    const { user, lastUrl, onUrlUpdate } = renderToolbar()
    await screen.findByText('Cadastro')

    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.click(screen.getByRole('button', { name: 'PQL' }))
    await user.type(screen.getByRole('textbox'), 'priority = LOW')

    // The query reaches the URL once typing pauses, in a single write.
    await waitFor(() => expect(lastUrl()?.get('pql')).toBe('priority = LOW'))
    expect(
      onUrlUpdate.mock.calls.filter(([update]) =>
        update.searchParams.has('pql'),
      ),
    ).toHaveLength(1)
    await waitFor(() => {
      expect(screen.getByText('Cadastro')).toBeInTheDocument()
      expect(screen.queryByText('Login')).not.toBeInTheDocument()
    })
    expect(lastUrl()?.get('mode')).toBe('pql')
  })

  it('keeps a query typed right before the panel is closed', async () => {
    mockProjectApi()
    const { user, lastUrl } = renderToolbar({ mode: 'pql' })
    await screen.findByText('Cadastro')

    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Consulta PQL' }),
      'priority = HIGH',
    )
    await user.click(screen.getByRole('button', { name: 'Fechar filtros' }))

    await waitFor(() => expect(lastUrl()?.get('pql')).toBe('priority = HIGH'))
    await waitFor(() =>
      expect(screen.queryByText('Cadastro')).not.toBeInTheDocument(),
    )
  })

  it('restores the full list when the filters are cleared', async () => {
    mockProjectApi()
    const { user } = renderToolbar({ mode: 'pql', pql: 'priority = LOW' })
    await screen.findByText('Cadastro')
    expect(screen.queryByText('Login')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Filtrar/ }))
    expect(screen.getByRole('textbox', { name: 'Consulta PQL' })).toHaveValue(
      'priority = LOW',
    )
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await screen.findByText('Login')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Consulta PQL' })).toHaveValue(
      '',
    )
  })

  it('says which filters are not supported yet instead of applying them', async () => {
    mockProjectApi()
    const { user } = renderToolbar({
      mode: 'pql',
      pql: 'hasComments() priority = HIGH',
    })
    await screen.findByText('Login')

    await user.click(screen.getByRole('button', { name: /Filtrar/ }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Estes filtros ainda não são suportados e foram ignorados: hasComments().',
    )
    expect(screen.queryByText('Cadastro')).not.toBeInTheDocument()
  })

  it('flags an unsupported basic field too', async () => {
    mockProjectApi()
    const { user } = renderToolbar({
      filters: JSON.stringify([
        { id: 'c1', field: 'mentions', operator: 'is', value: ['user-1'] },
      ]),
    })
    await screen.findByText('Cadastro')

    await user.click(screen.getByRole('button', { name: /Filtrar/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Menções')
  })
})
