import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  IssueGroupBy,
  IssueSortBy,
} from '@/components/layouts/use-issue-list-preferences'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { issuesKey } from '@/src/hooks/use-issue'
import type { CycleDTO } from '@/types/cycle'
import type { IssueDTO } from '@/types/issue'
import type { LabelDTO } from '@/types/label'
import type { ModuleDTO } from '@/types/module'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import { IssueListView } from '../issue-list-view'

// The real preferences store is a localStorage-backed singleton. Under
// Node >= 25 the runtime's own (file-less, undefined) `localStorage` global
// shadows jsdom's, so the store can't even initialise here. A plain object
// stands in; each test sets the grouping it needs before rendering.
const listPreferences = vi.hoisted(() => ({
  current: {
    groupBy: 'state' as IssueGroupBy,
    sortBy: 'manual' as IssueSortBy,
    showSubIssues: true,
    showEmptyGroups: true,
  },
}))

vi.mock('@/components/layouts/use-issue-list-preferences', () => ({
  useIssueListPreferences: () => ({
    preferences: listPreferences.current,
    update: vi.fn(),
  }),
}))

// Each row mounts the details drawer (closed) with the Plate editor inside;
// it plays no part in the list logic, so a no-op stands in for it.
vi.mock('../panel/issue-details-panel', () => ({
  IssueDetailsPanel: () => null,
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const BASE = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}`
const TIMESTAMPS = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function buildState(overrides: Partial<StateDTO> = {}): StateDTO {
  return {
    id: 'state-todo',
    name: 'A fazer',
    description: null,
    group: 'UNSTARTED',
    color: 'ZINC',
    order: 0,
    isDefault: false,
    projectId: 'project-1',
    ...TIMESTAMPS,
    ...overrides,
  }
}

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
    ...TIMESTAMPS,
    ...overrides,
  }
}

function buildCycle(overrides: Partial<CycleDTO> = {}): CycleDTO {
  return {
    id: 'cycle-1',
    name: 'Sprint 1',
    description: null,
    status: 'IN_PROGRESS',
    startDate: null,
    endDate: null,
    leadId: 'user-1',
    projectId: 'project-1',
    ...TIMESTAMPS,
    ...overrides,
  }
}

function buildModule(overrides: Partial<ModuleDTO> = {}): ModuleDTO {
  return {
    id: 'module-1',
    name: 'Autenticação',
    progress: 0,
    status: 'IN_PROGRESS',
    startDate: null,
    endDate: null,
    isFavorited: false,
    leadId: 'user-1',
    projectId: 'project-1',
    ...TIMESTAMPS,
    ...overrides,
  }
}

function buildLabel(overrides: Partial<LabelDTO> = {}): LabelDTO {
  return {
    id: 'label-1',
    name: 'Bug',
    description: null,
    color: 'RED',
    projectId: 'project-1',
    ...TIMESTAMPS,
    ...overrides,
  }
}

function buildMember(
  overrides: Partial<ProjectMemberDTO> = {},
): ProjectMemberDTO {
  return {
    userId: 'user-1',
    name: 'Ana Souza',
    username: 'ana',
    image: null,
    email: 'ana@nexo.dev',
    isLead: false,
    createdAt: TIMESTAMPS.createdAt,
    ...overrides,
  }
}

const STATES = [
  buildState({ id: 'state-todo', name: 'A fazer', order: 0 }),
  buildState({
    id: 'state-doing',
    name: 'Em andamento',
    group: 'STARTED',
    order: 1,
    isDefault: true,
  }),
  buildState({
    id: 'state-done',
    name: 'Concluído',
    group: 'COMPLETED',
    order: 2,
  }),
]

type ProjectData = {
  issues?: IssueDTO[]
  states?: StateDTO[]
  cycles?: CycleDTO[]
  modules?: ModuleDTO[]
  labels?: LabelDTO[]
  members?: ProjectMemberDTO[]
}

/**
 * Serves every GET the view and its row pickers make, routed by URL.
 * Mutations get back a fresh issue so the create flow can chain on its id.
 */
function mockProjectApi({
  issues = [],
  states = STATES,
  cycles = [],
  modules = [],
  labels = [],
  members = [],
}: ProjectData = {}) {
  return mockFetch().mockImplementation(async (input, init) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET')
      return apiSuccess(buildIssue({ id: 'issue-created' }))
    if (url.startsWith(`${BASE}/issues`))
      return apiSuccess({ items: issues, nextCursor: null })
    const resources: Record<string, unknown[]> = {
      [`${BASE}/states`]: states,
      [`${BASE}/cycles`]: cycles,
      [`${BASE}/modules`]: modules,
      [`${BASE}/labels`]: labels,
      [`${BASE}/members`]: members,
    }
    return apiSuccess(resources[url] ?? [])
  })
}

function mutationCalls(fetchSpy: ReturnType<typeof mockFetch>) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

function setPreferences(partial: Partial<typeof listPreferences.current>) {
  listPreferences.current = { ...listPreferences.current, ...partial }
}

beforeEach(() => {
  listPreferences.current = {
    groupBy: 'state',
    sortBy: 'manual',
    showSubIssues: true,
    showEmptyGroups: true,
  }
})

function renderList() {
  return renderWithProviders(
    <IssueListView
      workspaceId={WORKSPACE_ID}
      workspaceSlug='acme'
      projectSlug={PROJECT_SLUG}
      projectIdentifier='NEX'
    />,
  )
}

// base-ui wraps each accordion trigger in its own <h3>, so the section
// title is the <h3> nested inside it.
function sectionTitles() {
  return Array.from(document.querySelectorAll<HTMLElement>('h3 h3'))
}

function sectionNames() {
  return sectionTitles().map((title) => title.textContent)
}

function getSection(name: string) {
  const title = sectionTitles().find((heading) => heading.textContent === name)
  const section = title?.closest<HTMLElement>('[data-slot="accordion-item"]')
  if (!section) throw new Error(`section "${name}" not found`)
  return section
}

async function findSection(name: string) {
  await waitFor(() => getSection(name))
  return getSection(name)
}

/** Titles of the issue rows rendered inside a section, in order. */
function rowTitles(name: string) {
  return Array.from(
    getSection(name).querySelectorAll('[data-slot="context-menu-trigger"]'),
  ).map(
    (row) =>
      row.querySelector('[data-slot="tooltip-trigger"]')?.textContent ?? '',
  )
}

function getRow(title: string) {
  const row = screen
    .getByText(title)
    .closest<HTMLElement>('[data-slot="context-menu-trigger"]')
  if (!row) throw new Error(`row "${title}" not found`)
  return row
}

describe('<IssueListView /> grouping', () => {
  it('groups by state by default, counting the issues in each section', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', number: 1, title: 'Login' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Cadastro' }),
        buildIssue({
          id: 'i-3',
          number: 3,
          title: 'Deploy',
          stateId: 'state-done',
        }),
      ],
    })
    renderList()

    await screen.findByText('Login')
    expect(sectionNames()).toEqual(['A fazer', 'Em andamento', 'Concluído'])
    expect(rowTitles('A fazer')).toEqual(['Login', 'Cadastro'])
    expect(rowTitles('Em andamento')).toEqual([])
    expect(rowTitles('Concluído')).toEqual(['Deploy'])
    expect(within(getSection('A fazer')).getByText('2')).toBeInTheDocument()
    expect(
      within(getSection('Em andamento')).getByText('0'),
    ).toBeInTheDocument()
  })

  it('hides the empty sections when showEmptyGroups is off', async () => {
    setPreferences({ showEmptyGroups: false })
    mockProjectApi({ issues: [buildIssue({ title: 'Login' })] })
    renderList()

    await screen.findByText('Login')
    expect(sectionNames()).toEqual(['A fazer'])
  })

  it('renders nothing when every section is empty and empty groups are hidden', async () => {
    setPreferences({ showEmptyGroups: false })
    mockProjectApi({ issues: [] })
    const { queryClient } = renderList()

    await waitFor(() =>
      expect(
        queryClient.getQueryState(issuesKey(WORKSPACE_ID, PROJECT_SLUG))
          ?.status,
      ).toBe('success'),
    )
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(sectionTitles()).toHaveLength(0)
  })

  it('groups by priority into the five fixed priority sections', async () => {
    setPreferences({ groupBy: 'priority' })
    mockProjectApi({
      issues: [
        buildIssue({
          id: 'i-1',
          title: 'Queda do servidor',
          priority: 'URGENT',
        }),
        buildIssue({ id: 'i-2', number: 2, title: 'Typo', priority: 'LOW' }),
      ],
    })
    renderList()

    await screen.findByText('Typo')
    expect(sectionNames()).toEqual([
      'Nenhum',
      'Baixa',
      'Média',
      'Alta',
      'Urgente',
    ])
    expect(rowTitles('Urgente')).toEqual(['Queda do servidor'])
    expect(rowTitles('Baixa')).toEqual(['Typo'])
    expect(rowTitles('Nenhum')).toEqual([])
  })

  it('groups by cycle with a trailing "Sem ciclo" bucket', async () => {
    setPreferences({ groupBy: 'cycle' })
    mockProjectApi({
      cycles: [buildCycle({ id: 'cycle-1', name: 'Sprint 1' })],
      issues: [
        buildIssue({ id: 'i-1', title: 'No sprint', cycleId: 'cycle-1' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Fora do sprint' }),
      ],
    })
    renderList()

    await findSection('Sprint 1')
    expect(sectionNames()).toEqual(['Sprint 1', 'Sem ciclo'])
    expect(rowTitles('Sprint 1')).toEqual(['No sprint'])
    expect(rowTitles('Sem ciclo')).toEqual(['Fora do sprint'])
  })

  it('groups by module with a trailing "Sem módulo" bucket', async () => {
    setPreferences({ groupBy: 'module' })
    mockProjectApi({
      modules: [buildModule({ id: 'module-1', name: 'Autenticação' })],
      issues: [
        buildIssue({ id: 'i-1', title: 'OAuth', moduleId: 'module-1' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Landing' }),
      ],
    })
    renderList()

    await findSection('Autenticação')
    expect(sectionNames()).toEqual(['Autenticação', 'Sem módulo'])
    expect(rowTitles('Autenticação')).toEqual(['OAuth'])
    expect(rowTitles('Sem módulo')).toEqual(['Landing'])
  })

  it('lists an issue under every label it carries', async () => {
    setPreferences({ groupBy: 'labels' })
    mockProjectApi({
      labels: [
        buildLabel({ id: 'label-bug', name: 'Bug' }),
        buildLabel({ id: 'label-ux', name: 'UX', color: 'BLUE' }),
      ],
      issues: [
        buildIssue({
          id: 'i-1',
          title: 'Botão quebrado',
          labelIds: ['label-bug', 'label-ux'],
        }),
        buildIssue({ id: 'i-2', number: 2, title: 'Sem tag' }),
      ],
    })
    renderList()

    await findSection('Bug')
    expect(sectionNames()).toEqual(['Bug', 'UX', 'Sem etiqueta'])
    expect(rowTitles('Bug')).toEqual(['Botão quebrado'])
    expect(rowTitles('UX')).toEqual(['Botão quebrado'])
    expect(rowTitles('Sem etiqueta')).toEqual(['Sem tag'])
  })

  it('groups by assignee with a "Sem responsável" bucket', async () => {
    setPreferences({ groupBy: 'assignees' })
    mockProjectApi({
      members: [
        buildMember({ userId: 'user-1', name: 'Ana Souza' }),
        buildMember({
          userId: 'user-2',
          name: 'Bruno Lima',
          username: 'bruno',
        }),
      ],
      issues: [
        buildIssue({
          id: 'i-1',
          title: 'Par',
          assigneeIds: ['user-1', 'user-2'],
        }),
        buildIssue({ id: 'i-2', number: 2, title: 'Órfã' }),
      ],
    })
    renderList()

    await findSection('Ana Souza')
    expect(sectionNames()).toEqual([
      'Ana Souza',
      'Bruno Lima',
      'Sem responsável',
    ])
    expect(rowTitles('Ana Souza')).toEqual(['Par'])
    expect(rowTitles('Bruno Lima')).toEqual(['Par'])
    expect(rowTitles('Sem responsável')).toEqual(['Órfã'])
  })

  it('groups by author, one section per project member', async () => {
    setPreferences({ groupBy: 'created-by' })
    mockProjectApi({
      members: [
        buildMember({ userId: 'user-1', name: 'Ana Souza' }),
        buildMember({
          userId: 'user-2',
          name: 'Bruno Lima',
          username: 'bruno',
        }),
      ],
      issues: [
        buildIssue({ id: 'i-1', title: 'Da Ana', authorId: 'user-1' }),
        buildIssue({
          id: 'i-2',
          number: 2,
          title: 'Do Bruno',
          authorId: 'user-2',
        }),
      ],
    })
    renderList()

    await findSection('Ana Souza')
    expect(sectionNames()).toEqual(['Ana Souza', 'Bruno Lima'])
    expect(rowTitles('Ana Souza')).toEqual(['Da Ana'])
    expect(rowTitles('Bruno Lima')).toEqual(['Do Bruno'])
  })

  it('orders the state sections by the state order, not the API order', async () => {
    mockProjectApi({
      states: [STATES[2], STATES[0], STATES[1]],
      issues: [buildIssue({ title: 'Login' })],
    })
    renderList()

    await screen.findByText('Login')
    expect(sectionNames()).toEqual(['A fazer', 'Em andamento', 'Concluído'])
  })

  it('keeps issues whose state no longer exists in a "Sem estado" section', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Login' }),
        buildIssue({
          id: 'i-2',
          number: 2,
          title: 'Órfã',
          stateId: 'state-deleted',
        }),
      ],
    })
    renderList()

    await findSection('Sem estado')
    expect(sectionNames()).toEqual([
      'A fazer',
      'Em andamento',
      'Concluído',
      'Sem estado',
    ])
    expect(rowTitles('Sem estado')).toEqual(['Órfã'])
  })

  it('omits the "Sem estado" section while every issue has a known state', async () => {
    mockProjectApi({ issues: [buildIssue({ title: 'Login' })] })
    renderList()

    await screen.findByText('Login')
    expect(sectionNames()).not.toContain('Sem estado')
  })

  it('keeps issues by authors who left the project in an "Outros" section', async () => {
    setPreferences({ groupBy: 'created-by' })
    mockProjectApi({
      members: [buildMember({ userId: 'user-1', name: 'Ana Souza' })],
      issues: [
        buildIssue({ id: 'i-1', title: 'Da Ana', authorId: 'user-1' }),
        buildIssue({
          id: 'i-2',
          number: 2,
          title: 'De ex-membro',
          authorId: 'user-gone',
        }),
      ],
    })
    renderList()

    await findSection('Outros')
    expect(sectionNames()).toEqual(['Ana Souza', 'Outros'])
    expect(rowTitles('Outros')).toEqual(['De ex-membro'])
  })

  it('puts every issue in a single section when grouping is off', async () => {
    setPreferences({ groupBy: 'none' })
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Login' }),
        buildIssue({
          id: 'i-2',
          number: 2,
          title: 'Deploy',
          stateId: 'state-done',
        }),
      ],
    })
    renderList()

    await screen.findByText('Login')
    expect(sectionNames()).toEqual(['Todas as issues'])
    expect(rowTitles('Todas as issues')).toEqual(['Login', 'Deploy'])
  })
})

describe('<IssueListView /> rows', () => {
  it('shows the project-scoped identifier next to the title', async () => {
    mockProjectApi({ issues: [buildIssue({ number: 42, title: 'Login' })] })
    renderList()

    await screen.findByText('Login')
    expect(within(getRow('Login')).getByText('NEX-42')).toBeInTheDocument()
  })

  it('names the icon-only actions button of the row', async () => {
    mockProjectApi({ issues: [buildIssue({ title: 'Login' })] })
    renderList()

    await screen.findByText('Login')
    expect(
      within(getRow('Login')).getByRole('button', { name: 'Mais ações' }),
    ).toBeInTheDocument()
  })

  it('patches the priority picked from the row', async () => {
    const fetchSpy = mockProjectApi({
      issues: [buildIssue({ id: 'i-1', title: 'Login', priority: 'NONE' })],
    })
    const { user } = renderList()

    await screen.findByText('Login')
    await user.click(
      within(getRow('Login')).getByRole('button', { name: 'Nenhum' }),
    )
    await user.click(await screen.findByRole('option', { name: 'Alta' }))

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: `${BASE}/issues/i-1`,
          method: 'PATCH',
          body: { priority: 'HIGH' },
        },
      ]),
    )
  })

  it('patches the state picked from the row', async () => {
    const fetchSpy = mockProjectApi({
      issues: [buildIssue({ id: 'i-1', title: 'Login' })],
    })
    const { user } = renderList()

    await screen.findByText('Login')
    await user.click(
      await within(getRow('Login')).findByRole('button', { name: 'A fazer' }),
    )
    await user.click(await screen.findByRole('option', { name: 'Concluído' }))

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: `${BASE}/issues/i-1`,
          method: 'PATCH',
          body: { stateId: 'state-done' },
        },
      ]),
    )
  })
})

describe('<IssueListView /> re-picking the current value', () => {
  it('sends no request when the current priority is picked again', async () => {
    const fetchSpy = mockProjectApi({
      issues: [buildIssue({ id: 'i-1', title: 'Login', priority: 'HIGH' })],
    })
    const { user } = renderList()

    await screen.findByText('Login')
    await user.click(
      within(getRow('Login')).getByRole('button', { name: 'Alta' }),
    )
    await user.click(await screen.findByRole('option', { name: 'Alta' }))

    await waitFor(() =>
      expect(screen.queryByRole('option')).not.toBeInTheDocument(),
    )
    expect(mutationCalls(fetchSpy)).toEqual([])
  })

  it('sends no request when the current state is picked again', async () => {
    const fetchSpy = mockProjectApi({
      issues: [buildIssue({ id: 'i-1', title: 'Login' })],
    })
    const { user } = renderList()

    await screen.findByText('Login')
    await user.click(
      await within(getRow('Login')).findByRole('button', { name: 'A fazer' }),
    )
    await user.click(await screen.findByRole('option', { name: 'A fazer' }))

    await waitFor(() =>
      expect(screen.queryByRole('option')).not.toBeInTheDocument(),
    )
    expect(mutationCalls(fetchSpy)).toEqual([])
  })
})

describe('<IssueListView /> selection', () => {
  it('selects the whole section from its header checkbox', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Login' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Cadastro' }),
        buildIssue({
          id: 'i-3',
          number: 3,
          title: 'Deploy',
          stateId: 'state-done',
        }),
      ],
    })
    const { user } = renderList()

    await screen.findByText('Login')
    const [groupBox] = within(getSection('A fazer')).getAllByRole('checkbox')
    await user.click(groupBox)

    expect(within(getRow('Login')).getByRole('checkbox')).toBeChecked()
    expect(within(getRow('Cadastro')).getByRole('checkbox')).toBeChecked()
    // Selection is per section: the other group is untouched.
    expect(within(getRow('Deploy')).getByRole('checkbox')).not.toBeChecked()

    await user.click(groupBox)
    expect(within(getRow('Login')).getByRole('checkbox')).not.toBeChecked()
    expect(within(getRow('Cadastro')).getByRole('checkbox')).not.toBeChecked()
  })

  it('marks the section as partially selected when only some rows are', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Login' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Cadastro' }),
      ],
    })
    const { user } = renderList()

    await screen.findByText('Login')
    await user.click(within(getRow('Login')).getByRole('checkbox'))

    const [groupBox] = within(getSection('A fazer')).getAllByRole('checkbox')
    expect(groupBox).toHaveAttribute('aria-checked', 'mixed')

    // Completing the partial selection selects everything...
    await user.click(groupBox)
    expect(within(getRow('Cadastro')).getByRole('checkbox')).toBeChecked()
    expect(groupBox).toBeChecked()
  })
})

describe('<IssueListView /> quick create', () => {
  async function createIn(section: string, title: string) {
    const { user } = renderList()
    await findSection(section)
    await user.click(
      within(getSection(section)).getByRole('button', { name: 'Nova issue' }),
    )
    await user.type(
      screen.getByPlaceholderText('Nome da issue'),
      `${title}{Enter}`,
    )
  }

  it('opens the creator from the named "+" button in the section header', async () => {
    mockProjectApi()
    const { user } = renderList()
    await findSection('Concluído')

    await user.click(
      screen.getByRole('button', { name: 'Nova issue em Concluído' }),
    )

    expect(screen.getByPlaceholderText('Nome da issue')).toBeInTheDocument()
  })

  it('creates the issue in the state of the section it was added to', async () => {
    const fetchSpy = mockProjectApi()
    await createIn('Concluído', 'Nova tarefa')

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${BASE}/issues`,
      method: 'POST',
      body: { title: 'Nova tarefa', stateId: 'state-done' },
    })
  })

  it('uses the default state and the section priority when grouped by priority', async () => {
    setPreferences({ groupBy: 'priority' })
    const fetchSpy = mockProjectApi()
    await createIn('Alta', 'Urgência média')

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0].body).toMatchObject({
      stateId: 'state-doing',
      priority: 'HIGH',
    })
  })

  it('falls back to the first state when none is marked as default', async () => {
    setPreferences({ groupBy: 'none' })
    const fetchSpy = mockProjectApi({
      states: STATES.map((state) => ({ ...state, isDefault: false })),
    })
    await createIn('Todas as issues', 'Sem default')

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0].body).toMatchObject({
      stateId: 'state-todo',
    })
  })

  it('attaches the section label right after creating the issue', async () => {
    setPreferences({ groupBy: 'labels' })
    const fetchSpy = mockProjectApi({
      labels: [buildLabel({ id: 'label-bug', name: 'Bug' })],
    })
    await createIn('Bug', 'Crash no login')

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(2))
    const [create, attach] = mutationCalls(fetchSpy)
    expect(create).toMatchObject({ url: `${BASE}/issues`, method: 'POST' })
    expect(attach).toEqual({
      url: `${BASE}/issues/issue-created/labels`,
      method: 'POST',
      body: { labelId: 'label-bug' },
    })
  })

  it('assigns the section member right after creating the issue', async () => {
    setPreferences({ groupBy: 'assignees' })
    const fetchSpy = mockProjectApi({
      members: [buildMember({ userId: 'user-7', name: 'Carla Dias' })],
    })
    await createIn('Carla Dias', 'Revisar PR')

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(2))
    expect(mutationCalls(fetchSpy)[1]).toEqual({
      url: `${BASE}/issues/issue-created/assignees`,
      method: 'POST',
      body: { userId: 'user-7' },
    })
  })
})

describe('<IssueListView /> sorting and sub-issues', () => {
  const SORTABLE = [
    buildIssue({
      id: 'i-a',
      number: 1,
      title: 'A',
      priority: 'LOW',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-09T00:00:00.000Z',
      startDate: '2026-03-05T00:00:00.000Z',
      dueDate: null,
    }),
    buildIssue({
      id: 'i-b',
      number: 2,
      title: 'B',
      priority: 'URGENT',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-07T00:00:00.000Z',
      startDate: null,
      dueDate: '2026-03-20T00:00:00.000Z',
    }),
    buildIssue({
      id: 'i-c',
      number: 3,
      title: 'C',
      priority: 'NONE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-08T00:00:00.000Z',
      startDate: '2026-03-01T00:00:00.000Z',
      dueDate: '2026-03-10T00:00:00.000Z',
    }),
    buildIssue({
      id: 'i-d',
      number: 4,
      title: 'D',
      priority: 'HIGH',
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-06T00:00:00.000Z',
      startDate: null,
      dueDate: null,
    }),
  ]

  it.each([
    ['manual', ['A', 'B', 'C', 'D']],
    ['created-at', ['D', 'B', 'A', 'C']],
    ['updated-at', ['A', 'C', 'B', 'D']],
    ['start-date', ['C', 'A', 'B', 'D']],
    ['due-date', ['C', 'B', 'A', 'D']],
    ['priority', ['B', 'D', 'A', 'C']],
  ] as const)('sorts the rows of each section by %s', async (sortBy, expected) => {
    setPreferences({ sortBy })
    mockProjectApi({ issues: SORTABLE })
    renderList()

    await screen.findByText('A')
    expect(rowTitles('A fazer')).toEqual(expected)
  })

  it('hides sub-issues when showSubIssues is off', async () => {
    setPreferences({ showSubIssues: false })
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Pai' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Filha', parentId: 'i-1' }),
      ],
    })
    renderList()

    await screen.findByText('Pai')
    expect(rowTitles('A fazer')).toEqual(['Pai'])
  })

  it('lists sub-issues alongside their parents when showSubIssues is on', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Pai' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Filha', parentId: 'i-1' }),
      ],
    })
    renderList()

    await screen.findByText('Filha')
    expect(rowTitles('A fazer')).toEqual(['Pai', 'Filha'])
  })
})
