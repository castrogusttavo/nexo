import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
import { IssueCardList } from '../issue-card'

// The real drawer mounts the Plate editor. The stub only says whether it is
// open and for which issue — the row's job is to open it, nothing more.
vi.mock('../panel/issue-details-panel', () => ({
  IssueDetailsPanel: ({ open, issue }: { open: boolean; issue: IssueDTO }) =>
    open ? (
      <div role='dialog' aria-label={`Detalhes de ${issue.title}`} />
    ) : null,
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const BASE = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}`
const ISSUE_URL = `${BASE}/issues/issue-1`
const TIMESTAMPS = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
    number: 1,
    title: 'Corrigir login',
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

const STATES: StateDTO[] = [
  {
    id: 'state-todo',
    name: 'A fazer',
    description: null,
    group: 'UNSTARTED',
    color: 'ZINC',
    order: 0,
    isDefault: true,
    projectId: 'project-1',
    ...TIMESTAMPS,
  },
  {
    id: 'state-doing',
    name: 'Em andamento',
    description: null,
    group: 'STARTED',
    color: 'BLUE',
    order: 1,
    isDefault: false,
    projectId: 'project-1',
    ...TIMESTAMPS,
  },
]

const CYCLES: CycleDTO[] = [
  {
    id: 'cycle-1',
    name: 'Sprint 1',
    description: null,
    status: 'IN_PROGRESS',
    startDate: null,
    endDate: null,
    leadId: 'user-1',
    projectId: 'project-1',
    ...TIMESTAMPS,
  },
  {
    id: 'cycle-2',
    name: 'Sprint 2',
    description: null,
    status: 'NOT_STARTED',
    startDate: null,
    endDate: null,
    leadId: 'user-1',
    projectId: 'project-1',
    ...TIMESTAMPS,
  },
]

const MODULES: ModuleDTO[] = [
  {
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
  } as ModuleDTO,
]

const LABELS: LabelDTO[] = [
  {
    id: 'label-bug',
    name: 'Bug',
    description: null,
    color: 'RED',
    projectId: 'project-1',
    ...TIMESTAMPS,
  },
  {
    id: 'label-feat',
    name: 'Funcionalidade',
    description: null,
    color: 'GREEN',
    projectId: 'project-1',
    ...TIMESTAMPS,
  },
]

function member(userId: string, name: string): ProjectMemberDTO {
  return {
    userId,
    name,
    username: userId,
    image: null,
    email: `${userId}@nexo.dev`,
    isLead: false,
    createdAt: TIMESTAMPS.createdAt,
  }
}

const MEMBERS = [
  member('u-ana', 'Ana Souza'),
  member('u-bia', 'Beatriz Lima'),
  member('u-caio', 'Caio Prado'),
  member('u-duda', 'Duda Reis'),
  member('u-edu', 'Eduardo Melo'),
]

/** Serves the pickers' GETs by URL; every mutation echoes the issue back. */
function mockProjectApi() {
  return mockFetch().mockImplementation(async (input, init) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') return apiSuccess(buildIssue())
    const resources: Record<string, unknown[]> = {
      [`${BASE}/states`]: STATES,
      [`${BASE}/cycles`]: CYCLES,
      [`${BASE}/modules`]: MODULES,
      [`${BASE}/labels`]: LABELS,
      [`${BASE}/members`]: MEMBERS,
    }
    return apiSuccess(resources[url] ?? [])
  })
}

function mutationCalls(fetchSpy: ReturnType<typeof mockFetch>) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

function renderCard(
  overrides: Partial<IssueDTO> = {},
  { selected = false, onToggleSelected = vi.fn() } = {},
) {
  const fetchSpy = mockProjectApi()
  const view = renderWithProviders(
    <IssueCardList
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      issue={buildIssue(overrides)}
      identifier='NEX-1'
      selected={selected}
      onToggleSelected={onToggleSelected}
    />,
  )
  return { ...view, fetchSpy, onToggleSelected }
}

/** Waits until every picker has its list, so a label reflects the data. */
async function settled(
  queryClient: ReturnType<typeof renderCard>['queryClient'],
) {
  await waitFor(() => expect(queryClient.isFetching()).toBe(0))
}

const today = new Date()
const pastDue = new Date(
  Date.UTC(today.getFullYear() - 1, today.getMonth(), 1),
).toISOString()

describe('<IssueCardList /> what the row shows', () => {
  it.each<[string, Partial<IssueDTO>, string]>([
    // priority — always labelled, NONE included
    ['priority NONE', { priority: 'NONE' }, 'Nenhum'],
    ['priority LOW', { priority: 'LOW' }, 'Baixa'],
    ['priority MEDIUM', { priority: 'MEDIUM' }, 'Média'],
    ['priority HIGH', { priority: 'HIGH' }, 'Alta'],
    ['priority URGENT', { priority: 'URGENT' }, 'Urgente'],
    // state
    ['a known state', { stateId: 'state-doing' }, 'Em andamento'],
    ['a state missing from the list', { stateId: 'gone' }, 'Status'],
    // cycle
    ['no cycle', { cycleId: null }, 'Ciclo'],
    ['a cycle', { cycleId: 'cycle-2' }, 'Sprint 2'],
    ['a cycle missing from the list', { cycleId: 'gone' }, 'Ciclo'],
    // module
    ['no module', { moduleId: null }, 'Módulo'],
    ['a module', { moduleId: 'module-1' }, 'Autenticação'],
    ['a module missing from the list', { moduleId: 'gone' }, 'Módulo'],
    // labels
    ['no labels', { labelIds: [] }, 'Etiqueta'],
    ['one label, by name', { labelIds: ['label-feat'] }, 'Funcionalidade'],
    [
      'several labels, as a count',
      { labelIds: ['label-bug', 'label-feat'] },
      '2 Etiquetas',
    ],
    ['labels unknown to the project', { labelIds: ['gone'] }, 'Etiqueta'],
    // assignees
    ['no assignees', { assigneeIds: [] }, 'Responsáveis'],
    ['one assignee, by initials', { assigneeIds: ['u-bia'] }, 'BL'],
    // dates
    ['no dates', {}, 'Datas'],
    [
      'only a start date',
      { startDate: '2026-03-10T00:00:00.000Z' },
      'A partir de 10/03/2026',
    ],
    [
      'only a due date',
      { dueDate: '2026-03-20T00:00:00.000Z' },
      'Até 20/03/2026',
    ],
    [
      'a start and a due date',
      {
        startDate: '2026-03-10T00:00:00.000Z',
        dueDate: '2026-03-20T00:00:00.000Z',
      },
      '10/03/2026 - 20/03/2026',
    ],
  ])('%s → "%s"', async (_label, overrides, expected) => {
    const { queryClient } = renderCard(overrides)
    await settled(queryClient)

    expect(screen.getByRole('button', { name: expected })).toBeInTheDocument()
  })

  it('caps the assignee avatars at three and counts the rest', async () => {
    const { queryClient } = renderCard({
      assigneeIds: MEMBERS.map((m) => m.userId),
    })
    await settled(queryClient)

    expect(screen.getByText('+2')).toBeInTheDocument()
    for (const initials of ['AS', 'BL', 'CP']) {
      expect(screen.getByText(initials)).toBeInTheDocument()
    }
    expect(screen.queryByText('DR')).not.toBeInTheDocument()
    expect(screen.queryByText('Responsáveis')).not.toBeInTheDocument()
  })

  it('does not show the overflow count at exactly three assignees', async () => {
    const { queryClient } = renderCard({
      assigneeIds: ['u-ana', 'u-bia', 'u-caio'],
    })
    await settled(queryClient)

    expect(screen.getByText('CP')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('paints an overdue due date red', async () => {
    const { queryClient } = renderCard({ dueDate: pastDue })
    await settled(queryClient)

    expect(screen.getByRole('button', { name: /^Até / })).toHaveClass(
      'text-red-500',
    )
  })

  it('shows the identifier and title, and the selection state', async () => {
    renderCard({}, { selected: true })

    expect(screen.getByText('NEX-1')).toBeInTheDocument()
    expect(screen.getByText('Corrigir login')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Selecionar Corrigir login' }),
    ).toBeChecked()
  })
})

describe('<IssueCardList /> editing from the row', () => {
  it.each<[string, Partial<IssueDTO>, string, string, Record<string, unknown>]>(
    [
      [
        'priority',
        { priority: 'NONE' },
        'Nenhum',
        'Urgente',
        { priority: 'URGENT' },
      ],
      ['state', {}, 'A fazer', 'Em andamento', { stateId: 'state-doing' }],
      ['cycle', {}, 'Ciclo', 'Sprint 1', { cycleId: 'cycle-1' }],
      [
        'cycle, cleared',
        { cycleId: 'cycle-1' },
        'Sprint 1',
        'Nenhum ciclo',
        { cycleId: null },
      ],
      ['module', {}, 'Módulo', 'Autenticação', { moduleId: 'module-1' }],
      [
        'module, cleared',
        { moduleId: 'module-1' },
        'Autenticação',
        'Nenhum módulo',
        { moduleId: null },
      ],
    ],
  )('patches the %s picked in the row', async (_field, overrides, trigger, option, body) => {
    const { user, fetchSpy, queryClient } = renderCard(overrides)
    await settled(queryClient)

    await user.click(screen.getByRole('button', { name: trigger }))
    await user.click(await screen.findByRole('option', { name: option }))

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        { url: ISSUE_URL, method: 'PATCH', body },
      ]),
    )
  })

  it('adds a newly ticked label and invalidates the issue list', async () => {
    const { user, fetchSpy, queryClient } = renderCard({
      labelIds: ['label-bug'],
    })
    await settled(queryClient)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByRole('button', { name: 'Bug' }))
    await user.click(
      await screen.findByRole('option', { name: 'Funcionalidade' }),
    )

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: `${ISSUE_URL}/labels`,
          method: 'POST',
          body: { labelId: 'label-feat' },
        },
      ]),
    )
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: issuesKey(WORKSPACE_ID, PROJECT_SLUG),
      }),
    )
  })

  it('removes an unticked label', async () => {
    const { user, fetchSpy, queryClient } = renderCard({
      labelIds: ['label-bug'],
    })
    await settled(queryClient)

    await user.click(screen.getByRole('button', { name: 'Bug' }))
    await user.click(await screen.findByRole('option', { name: 'Bug' }))

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: `${ISSUE_URL}/labels/label-bug`,
          method: 'DELETE',
          body: undefined,
        },
      ]),
    )
  })

  it('assigns a newly ticked member', async () => {
    const { user, fetchSpy, queryClient } = renderCard()
    await settled(queryClient)

    await user.click(screen.getByRole('button', { name: 'Responsáveis' }))
    await user.click(await screen.findByRole('option', { name: /Caio Prado/ }))

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: `${ISSUE_URL}/assignees`,
          method: 'POST',
          body: { userId: 'u-caio' },
        },
      ]),
    )
  })

  it('unassigns an unticked member', async () => {
    const { user, fetchSpy, queryClient } = renderCard({
      assigneeIds: ['u-ana'],
    })
    await settled(queryClient)

    await user.click(screen.getByRole('button', { name: 'AS' }))
    await user.click(await screen.findByRole('option', { name: /Ana Souza/ }))

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: `${ISSUE_URL}/assignees/u-ana`,
          method: 'DELETE',
          body: undefined,
        },
      ]),
    )
  })

  it('patches the day picked in the date range as a UTC calendar day', async () => {
    const { user, fetchSpy, queryClient } = renderCard({
      startDate: '2026-03-10T00:00:00.000Z',
    })
    await settled(queryClient)

    await user.click(
      screen.getByRole('button', { name: 'A partir de 10/03/2026' }),
    )
    const day15 = (await screen.findAllByRole('button')).find(
      (button) => button.closest('td')?.textContent?.trim() === '15',
    )
    if (!day15) throw new Error('day 15 not rendered')
    await user.click(day15)

    await waitFor(() =>
      expect(mutationCalls(fetchSpy)).toEqual([
        {
          url: ISSUE_URL,
          method: 'PATCH',
          body: {
            startDate: '2026-03-10T00:00:00.000Z',
            // The calendar opens on the current month.
            dueDate: new Date(
              Date.UTC(today.getFullYear(), today.getMonth(), 15),
            ).toISOString(),
          },
        },
      ]),
    )
  })
})

describe('<IssueCardList /> row interactions', () => {
  it('opens the details drawer when the row is clicked', async () => {
    const { user } = renderCard()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByText('Corrigir login'))

    expect(
      await screen.findByRole('dialog', { name: 'Detalhes de Corrigir login' }),
    ).toBeInTheDocument()
  })

  it('toggles the selection without opening the drawer', async () => {
    const { user, onToggleSelected } = renderCard()

    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar Corrigir login' }),
    )

    expect(onToggleSelected).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not open the drawer when a picker is used', async () => {
    const { user, queryClient } = renderCard()
    await settled(queryClient)

    await user.click(screen.getByRole('button', { name: 'Nenhum' }))

    expect(
      await screen.findByRole('option', { name: 'Alta' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: /Detalhes/ }),
    ).not.toBeInTheDocument()
  })
})
