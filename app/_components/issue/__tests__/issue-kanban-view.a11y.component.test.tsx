import { screen } from '@testing-library/react'
import { describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import { IssueKanbanView } from '../issue-kanban-view'

// The real panel mounts the Plate rich editor; a marker is enough here.
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
const TIMESTAMPS = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// The board is a page fragment mounted inside the workspace shell, which
// owns the landmarks and the <h1>.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

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
  }),
  buildState({
    id: 'state-done',
    name: 'Concluído',
    group: 'COMPLETED',
    order: 2,
  }),
]

const ISSUES = [
  buildIssue({ id: 'i-1', number: 1, title: 'Login', priority: 'HIGH' }),
  buildIssue({
    id: 'i-2',
    number: 2,
    title: 'Cadastro',
    stateId: 'state-doing',
    assigneeIds: ['user-1'],
  }),
  buildIssue({ id: 'i-3', number: 3, title: 'Deploy', stateId: 'state-done' }),
]

function mockProjectApi(issues: IssueDTO[]) {
  return mockFetch().mockImplementation(async (input, init) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') return apiSuccess(issues[0])
    if (url.startsWith(`${BASE}/issues`))
      return apiSuccess({ items: issues, nextCursor: null })
    if (url === `${BASE}/states`) return apiSuccess(STATES)
    if (url === `${BASE}/members`) return apiSuccess([buildMember()])
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

describe('<IssueKanbanView /> accessibility', () => {
  it('has no violations with cards across the columns', async () => {
    mockProjectApi(ISSUES)
    const { container } = renderBoard()

    await screen.findByText('Login')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations on an empty board', async () => {
    mockProjectApi([])
    const { container } = renderBoard()

    await screen.findByRole('heading', { name: 'A fazer' })

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
