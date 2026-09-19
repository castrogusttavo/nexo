import { screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { issuesKey } from '@/src/hooks/use-issue'
import type { IssueDTO } from '@/types/issue'
import type { StateDTO } from '@/types/state'
import { IssueGanttView } from '../issue-gantt-view'

// The real panel mounts the Plate rich editor; a marker is enough to know
// which issue the timeline opened.
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
// Mirrors DAY_WIDTH in the view: each day column is 32px wide.
const DAY = 32
// Every timeline is padded with two empty days on each side.
const PADDING_DAYS = 2

/** Local midnight serialised to ISO, as the date picker stores it. */
function localDay(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).toISOString()
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

const STATES: StateDTO[] = [
  {
    id: 'state-todo',
    name: 'A fazer',
    description: null,
    group: 'UNSTARTED',
    color: 'BLUE',
    order: 0,
    isDefault: true,
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

function mockProjectApi(issues: IssueDTO[], states = STATES) {
  return mockFetch().mockImplementation(async (input) => {
    const url = String(input)
    if (url.startsWith(`${BASE}/issues`))
      return apiSuccess({ items: issues, nextCursor: null })
    if (url === `${BASE}/states`) return apiSuccess(states)
    return apiSuccess([])
  })
}

function renderTimeline() {
  return renderWithProviders(
    <IssueGanttView
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      projectIdentifier='NEX'
    />,
  )
}

/** The timeline bar of an issue: the only button named by the bare title. */
function findBar(title: string) {
  return screen.findByRole('button', { name: title })
}

/** Horizontal placement of a bar, in days from the start of the range. */
function barGeometry(bar: HTMLElement) {
  return {
    offsetDays: Number.parseFloat(bar.style.left) / DAY,
    spanDays: (Number.parseFloat(bar.style.width) + 4) / DAY,
  }
}

describe('<IssueGanttView /> empty state', () => {
  it('explains the timeline is empty when no issue has dates', async () => {
    mockProjectApi([])
    const { queryClient } = renderTimeline()

    await waitFor(() =>
      expect(
        queryClient.getQueryState(issuesKey(WORKSPACE_ID, PROJECT_SLUG))
          ?.status,
      ).toBe('success'),
    )
    expect(
      screen.getByText(
        'Nenhuma issue com data de início ou prazo definida ainda.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Defina uma data para ver a issue no cronograma.'),
    ).not.toBeInTheDocument()
  })

  it('hints at setting a date when only undated issues exist', async () => {
    mockProjectApi([buildIssue({ title: 'Sem datas' })])
    renderTimeline()

    expect(
      await screen.findByText(
        'Defina uma data para ver a issue no cronograma.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Sem datas')).not.toBeInTheDocument()
  })
})

describe('<IssueGanttView /> scheduling', () => {
  it('lists scheduled issues ordered by their start date', async () => {
    mockProjectApi([
      buildIssue({
        id: 'i-late',
        number: 1,
        title: 'Tardia',
        startDate: localDay(2026, 3, 20),
        dueDate: localDay(2026, 3, 22),
      }),
      buildIssue({
        id: 'i-early',
        number: 2,
        title: 'Cedo',
        startDate: localDay(2026, 3, 2),
        dueDate: localDay(2026, 3, 4),
      }),
    ])
    renderTimeline()

    await findBar('Tardia')
    const bars = screen
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(bars).toEqual(['Cedo', 'Tardia'])
  })

  it('spans a bar from its start to its due date, inclusive', async () => {
    mockProjectApi([
      buildIssue({
        title: 'Sprint',
        startDate: localDay(2026, 3, 10),
        dueDate: localDay(2026, 3, 12),
      }),
    ])
    renderTimeline()

    const bar = await findBar('Sprint')
    expect(barGeometry(bar)).toEqual({
      offsetDays: PADDING_DAYS,
      spanDays: 3,
    })
  })

  it('offsets later issues relative to the earliest start', async () => {
    mockProjectApi([
      buildIssue({
        id: 'i-1',
        title: 'Primeira',
        startDate: localDay(2026, 3, 1),
        dueDate: localDay(2026, 3, 2),
      }),
      buildIssue({
        id: 'i-2',
        number: 2,
        title: 'Segunda',
        startDate: localDay(2026, 3, 8),
        dueDate: localDay(2026, 3, 8),
      }),
    ])
    renderTimeline()

    const bar = await findBar('Segunda')
    // 1 Mar is the earliest start; 8 Mar is 7 days later, plus the padding.
    expect(barGeometry(bar)).toEqual({
      offsetDays: PADDING_DAYS + 7,
      spanDays: 1,
    })
  })

  it('draws a one-day bar when only the due date is set', async () => {
    mockProjectApi([
      buildIssue({ title: 'Prazo', dueDate: localDay(2026, 3, 9) }),
    ])
    renderTimeline()

    expect(barGeometry(await findBar('Prazo'))).toEqual({
      offsetDays: PADDING_DAYS,
      spanDays: 1,
    })
  })

  it('draws a one-day bar when only the start date is set', async () => {
    mockProjectApi([
      buildIssue({ title: 'Início', startDate: localDay(2026, 3, 9) }),
    ])
    renderTimeline()

    expect(barGeometry(await findBar('Início'))).toEqual({
      offsetDays: PADDING_DAYS,
      spanDays: 1,
    })
  })

  it('tolerates a start date after the due date by swapping them', async () => {
    mockProjectApi([
      buildIssue({
        title: 'Invertida',
        startDate: localDay(2026, 3, 14),
        dueDate: localDay(2026, 3, 11),
      }),
    ])
    renderTimeline()

    expect(barGeometry(await findBar('Invertida'))).toEqual({
      offsetDays: PADDING_DAYS,
      spanDays: 4,
    })
  })

  it('colours the bar with its state colour, grey when the state is unknown', async () => {
    mockProjectApi([
      buildIssue({ id: 'i-1', title: 'Azul', dueDate: localDay(2026, 3, 3) }),
      buildIssue({
        id: 'i-2',
        number: 2,
        title: 'Sem estado',
        stateId: 'state-gone',
        dueDate: localDay(2026, 3, 4),
      }),
    ])
    renderTimeline()

    expect(await findBar('Azul')).toHaveClass('bg-blue-500')
    expect(await findBar('Sem estado')).toHaveClass('bg-zinc-500')
  })

  it('shows the identifier and title in the row label', async () => {
    mockProjectApi([
      buildIssue({ number: 12, title: 'Login', dueDate: localDay(2026, 3, 3) }),
    ])
    renderTimeline()

    await findBar('Login')
    expect(screen.getByText('NEX-12')).toBeInTheDocument()
  })
})

describe('<IssueGanttView /> undated tray', () => {
  it('collects the undated issues below the timeline', async () => {
    mockProjectApi([
      buildIssue({ id: 'i-1', title: 'Datada', dueDate: localDay(2026, 3, 3) }),
      buildIssue({ id: 'i-2', number: 2, title: 'Solta' }),
    ])
    renderTimeline()

    const heading = await screen.findByRole('heading', {
      name: 'Sem data definida',
    })
    const tray = heading.parentElement?.parentElement as HTMLElement
    expect(within(tray).getByText('1')).toBeInTheDocument()
    expect(
      within(tray).getByRole('button', { name: 'NEX-2 Solta' }),
    ).toBeInTheDocument()
  })

  it('omits the tray when every issue is scheduled', async () => {
    mockProjectApi([
      buildIssue({ title: 'Datada', dueDate: localDay(2026, 3, 3) }),
    ])
    renderTimeline()

    await findBar('Datada')
    expect(
      screen.queryByRole('heading', { name: 'Sem data definida' }),
    ).not.toBeInTheDocument()
  })
})

describe('<IssueGanttView /> details', () => {
  it('opens the details panel from a timeline bar', async () => {
    mockProjectApi([
      buildIssue({ id: 'i-1', title: 'Login', dueDate: localDay(2026, 3, 3) }),
    ])
    const { user } = renderTimeline()

    await user.click(await findBar('Login'))

    expect(
      screen.getByRole('dialog', { name: 'Detalhes da issue' }),
    ).toHaveTextContent('Login')
  })

  it('opens the details panel from the undated tray', async () => {
    mockProjectApi([
      buildIssue({ id: 'i-1', title: 'Login', dueDate: localDay(2026, 3, 3) }),
      buildIssue({ id: 'i-2', number: 2, title: 'Solta' }),
    ])
    const { user } = renderTimeline()

    await user.click(await screen.findByRole('button', { name: 'NEX-2 Solta' }))

    expect(
      screen.getByRole('dialog', { name: 'Detalhes da issue' }),
    ).toHaveTextContent('Solta')
  })
})

describe('<IssueGanttView /> timezones', () => {
  // Node re-reads TZ when it changes, so a viewer west of UTC is simulated
  // here whatever timezone the suite itself runs in.
  const originalTz = process.env.TZ
  beforeAll(() => {
    process.env.TZ = 'America/Sao_Paulo'
  })
  afterAll(() => {
    process.env.TZ = originalTz
  })

  it('spans the calendar days of dates stored as UTC midnight', async () => {
    mockProjectApi([
      buildIssue({
        id: 'i-1',
        title: 'Base',
        dueDate: '2026-03-01T00:00:00.000Z',
      }),
      buildIssue({
        id: 'i-2',
        number: 2,
        title: 'Sprint',
        startDate: '2026-03-10T00:00:00.000Z',
        dueDate: '2026-03-12T00:00:00.000Z',
      }),
    ])
    renderTimeline()

    // 1 Mar opens the range, so 10 Mar sits 9 days in, plus the padding.
    expect(barGeometry(await findBar('Sprint'))).toEqual({
      offsetDays: PADDING_DAYS + 9,
      spanDays: 3,
    })
    // The day header starts two days before 1 Mar: 27 Feb.
    expect(
      screen.getByText('Issue').nextElementSibling?.firstElementChild,
    ).toHaveTextContent(/^27/)
  })
})
