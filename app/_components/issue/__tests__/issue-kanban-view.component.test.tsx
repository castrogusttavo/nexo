import { act, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCommitMeta } from '@/components/ui/kanban'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import { IssueKanbanView } from '../issue-kanban-view'

// Drag-and-drop can't be simulated in jsdom, so the real <Kanban> is kept
// for rendering but its `onValueCommit` prop is captured. Tests call it
// directly with the meta dnd-kit would produce on drop, which exercises
// the view's own move handler without any pointer events.
const kanban = vi.hoisted(() => ({
  commit: null as
    | null
    | ((
        value: Record<string, IssueDTO[]>,
        meta: KanbanCommitMeta<IssueDTO>,
      ) => void),
}))

vi.mock('@/components/ui/kanban', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/kanban')>()
  function CapturingKanban(props: ComponentProps<typeof actual.Kanban>) {
    kanban.commit = props.onValueCommit as typeof kanban.commit
    return <actual.Kanban {...props} />
  }
  return { ...actual, Kanban: CapturingKanban }
})

// The real panel mounts the Plate rich editor; a marker is enough to know
// which issue the board opened.
vi.mock('../panel/issue-details-panel', () => ({
  IssueDetailsPanel: ({ issue }: { issue: IssueDTO }) => (
    <div role='dialog' aria-label='Detalhes da issue'>
      {issue.title}
    </div>
  ),
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const BASE = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}`
// Mirrors the private key in `use-state.ts`.
const STATES_KEY = [['states'], WORKSPACE_ID, PROJECT_SLUG]

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// States are returned out of `order` on purpose: the board must sort them.
const STATES = [
  buildState({
    id: 'state-done',
    name: 'Concluído',
    group: 'COMPLETED',
    order: 2,
  }),
  buildState({ id: 'state-todo', name: 'A fazer', order: 0 }),
  buildState({
    id: 'state-doing',
    name: 'Em andamento',
    group: 'STARTED',
    order: 1,
  }),
]

/**
 * Routes the view's GET requests by URL and answers any mutation with the
 * issue it targets, so every test starts from the same project snapshot.
 */
function mockProjectApi({
  issues = [] as IssueDTO[],
  states = STATES,
  members = [] as ProjectMemberDTO[],
} = {}) {
  return mockFetch().mockImplementation(async (input, init) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') return apiSuccess(issues[0])
    if (url.startsWith(`${BASE}/issues`))
      return apiSuccess({ items: issues, nextCursor: null })
    if (url === `${BASE}/states`) return apiSuccess(states)
    if (url === `${BASE}/members`) return apiSuccess(members)
    return apiSuccess([])
  })
}

function renderBoard() {
  return renderWithProviders(
    <IssueKanbanView
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      projectIdentifier='NEX'
    />,
  )
}

function getColumn(name: string) {
  const heading = screen.getByRole('heading', { name })
  const column = heading.closest<HTMLElement>('[data-slot="kanban-column"]')
  if (!column) throw new Error(`column "${name}" not found`)
  return column
}

// Each card is a native <button> nested in the sortable item (which also
// carries role="button"), so resolve the card from its title text.
async function findCard(title: string) {
  const card = (await screen.findByText(title)).closest('button')
  if (!card) throw new Error(`card "${title}" not found`)
  return card
}

function commitMove(meta: Partial<KanbanCommitMeta<IssueDTO>>) {
  if (!kanban.commit) throw new Error('Kanban was not rendered')
  const commit = kanban.commit
  const { previousValue = {}, ...rest } = meta
  act(() =>
    commit(previousValue, {
      kind: 'item',
      event: {} as KanbanCommitMeta<IssueDTO>['event'],
      activeContainer: 'state-todo',
      activeIndex: 0,
      overContainer: 'state-doing',
      overIndex: 0,
      previousValue,
      ...rest,
    }),
  )
}

beforeEach(() => {
  kanban.commit = null
})

describe('<IssueKanbanView /> columns', () => {
  it('renders one column per state, sorted by the state order', async () => {
    mockProjectApi()
    renderBoard()

    await screen.findByRole('heading', { name: 'A fazer' })
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['A fazer', 'Em andamento', 'Concluído'])
  })

  it('places each issue in its state column and counts them', async () => {
    mockProjectApi({
      issues: [
        buildIssue({
          id: 'i-1',
          number: 1,
          title: 'Login',
          stateId: 'state-todo',
        }),
        buildIssue({
          id: 'i-2',
          number: 2,
          title: 'Cadastro',
          stateId: 'state-todo',
        }),
        buildIssue({
          id: 'i-3',
          number: 3,
          title: 'Deploy',
          stateId: 'state-done',
        }),
      ],
    })
    renderBoard()

    await screen.findByText('Login')
    const todo = within(getColumn('A fazer'))
    expect(todo.getByText('Login')).toBeInTheDocument()
    expect(todo.getByText('Cadastro')).toBeInTheDocument()
    expect(todo.getByText('2')).toBeInTheDocument()

    const doing = within(getColumn('Em andamento'))
    expect(doing.getByText('0')).toBeInTheDocument()
    expect(doing.queryAllByRole('button')).toHaveLength(0)

    const done = within(getColumn('Concluído'))
    expect(done.getByText('Deploy')).toBeInTheDocument()
    expect(done.getByText('1')).toBeInTheDocument()
  })

  it('keeps issues whose state is not on the board in a trailing "Sem estado" column', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Visível' }),
        buildIssue({ id: 'i-2', title: 'Órfã', stateId: 'state-deleted' }),
      ],
    })
    renderBoard()

    await screen.findByText('Visível')
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual([
      'A fazer',
      'Em andamento',
      'Concluído',
      'Sem estado',
    ])
    const orphans = screen
      .getByRole('heading', { name: 'Sem estado' })
      .closest<HTMLElement>('[data-slot="kanban-no-state-column"]')
    if (!orphans) throw new Error('"Sem estado" column not found')
    expect(within(orphans).getByText('Órfã')).toBeInTheDocument()
    expect(within(orphans).getByText('1')).toBeInTheDocument()
    // It is not a drop target: no sortable column wraps it.
    expect(orphans.closest('[data-slot="kanban-column"]')).toBeNull()
  })

  it('opens the details panel for an issue without a state', async () => {
    mockProjectApi({
      issues: [buildIssue({ id: 'i-2', title: 'Órfã', stateId: 'gone' })],
    })
    const { user } = renderBoard()

    await user.click(await findCard('Órfã'))

    expect(
      screen.getByRole('dialog', { name: 'Detalhes da issue' }),
    ).toHaveTextContent('Órfã')
  })

  it('omits the "Sem estado" column while every issue has a known state', async () => {
    mockProjectApi({ issues: [buildIssue({ title: 'Visível' })] })
    renderBoard()

    await screen.findByText('Visível')
    expect(
      screen.queryByRole('heading', { name: 'Sem estado' }),
    ).not.toBeInTheDocument()
  })

  it('renders nothing while the project has no states', async () => {
    mockProjectApi({ states: [], issues: [buildIssue()] })
    const { container, queryClient } = renderBoard()

    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(queryClient.getQueryData(STATES_KEY)).toEqual([])
    expect(container).toBeEmptyDOMElement()
  })
})

describe('<IssueKanbanView /> cards', () => {
  it('shows the identifier, the title and the known assignees', async () => {
    mockProjectApi({
      issues: [
        buildIssue({
          number: 42,
          title: 'Revisar contrato',
          assigneeIds: ['user-1', 'user-gone'],
        }),
      ],
      members: [buildMember({ userId: 'user-1', name: 'Ana Souza' })],
    })
    renderBoard()

    const card = await findCard('Revisar contrato')
    expect(within(card).getByText('NEX-42')).toBeInTheDocument()
    await within(card).findByText('AN')
    // The unknown assignee id is filtered out rather than rendered blank.
    expect(card.querySelectorAll('[data-slot="avatar-fallback"]')).toHaveLength(
      1,
    )
  })

  it('opens the details panel for the clicked card', async () => {
    mockProjectApi({
      issues: [
        buildIssue({ id: 'i-1', title: 'Login' }),
        buildIssue({ id: 'i-2', number: 2, title: 'Cadastro' }),
      ],
    })
    const { user } = renderBoard()

    await user.click(await findCard('Cadastro'))

    const panel = screen.getByRole('dialog', { name: 'Detalhes da issue' })
    expect(panel).toHaveTextContent('Cadastro')
  })
})

describe('<IssueKanbanView /> moving cards', () => {
  const issues = [
    buildIssue({ id: 'i-1', title: 'Login', stateId: 'state-todo' }),
    buildIssue({
      id: 'i-2',
      number: 2,
      title: 'Cadastro',
      stateId: 'state-todo',
    }),
  ]

  it('patches the issue state when a card lands in another column', async () => {
    const fetchSpy = mockProjectApi({ issues })
    renderBoard()
    await screen.findByText('Cadastro')
    const readsBeforeDrop = fetchSpy.mock.calls.length

    commitMove({
      activeContainer: 'state-todo',
      activeIndex: 1,
      overContainer: 'state-doing',
      previousValue: {
        'state-todo': issues,
        'state-doing': [],
        'state-done': [],
      },
    })

    await waitFor(() =>
      expect(getFetchCall(fetchSpy, readsBeforeDrop)).toEqual({
        url: `${BASE}/issues/i-2`,
        method: 'PATCH',
        body: { stateId: 'state-doing' },
      }),
    )
  })

  it('sends no request when the card is reordered inside its column', async () => {
    const fetchSpy = mockProjectApi({ issues })
    renderBoard()
    await screen.findByText('Cadastro')

    commitMove({
      activeContainer: 'state-todo',
      overContainer: 'state-todo',
      previousValue: { 'state-todo': issues },
    })

    await new Promise((resolve) => setTimeout(resolve, 20))
    const mutations = fetchSpy.mock.calls.filter(
      ([, init]) => init?.method === 'PATCH',
    )
    expect(mutations).toHaveLength(0)
  })

  it('sends no request when a whole column is dragged', async () => {
    const fetchSpy = mockProjectApi({ issues })
    renderBoard()
    await screen.findByText('Cadastro')

    commitMove({
      kind: 'column',
      activeContainer: 'state-todo',
      overContainer: 'state-doing',
      previousValue: { 'state-todo': issues },
    })

    await new Promise((resolve) => setTimeout(resolve, 20))
    const mutations = fetchSpy.mock.calls.filter(
      ([, init]) => init?.method === 'PATCH',
    )
    expect(mutations).toHaveLength(0)
  })
})
