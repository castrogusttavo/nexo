import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'
import type {
  IssueGroupBy,
  IssueSortBy,
} from '@/components/layouts/use-issue-list-preferences'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import { IssueListView } from '../issue-list-view'

// The real preferences store is a localStorage-backed singleton that cannot
// initialise under Node >= 25; a plain object stands in, as in the
// behavioural suite next to this file.
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
// it plays no part in the list markup, so a no-op stands in for it.
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

// The list is a page fragment mounted inside the workspace shell, which owns
// the landmarks and the <h1>.
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
    isDefault: true,
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
    assigneeIds: ['user-1'],
  }),
  buildIssue({
    id: 'i-3',
    number: 3,
    title: 'Deploy',
    stateId: 'state-done',
  }),
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

beforeEach(() => {
  listPreferences.current = {
    groupBy: 'state',
    sortBy: 'manual',
    showSubIssues: true,
    showEmptyGroups: true,
  }
})

describe('<IssueListView /> accessibility', () => {
  it('has no violations with issues grouped by state', async () => {
    mockProjectApi(ISSUES)
    const { container } = renderList()

    await screen.findByText('Login')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations on the empty list', async () => {
    mockProjectApi([])
    const { container } = renderList()

    await screen.findByText('A fazer')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations grouped by priority', async () => {
    listPreferences.current = {
      ...listPreferences.current,
      groupBy: 'priority',
    }
    mockProjectApi(ISSUES)
    const { container } = renderList()

    await screen.findByText('Login')

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
