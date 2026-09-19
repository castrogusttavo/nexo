import { screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { issuesKey } from '@/src/hooks/use-issue'
import type { IssueDTO } from '@/types/issue'
import { IssueCalendarView } from '../issue-calendar-view'

// The real panel mounts the Plate rich editor; a marker is enough to know
// which issue the calendar opened.
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

/**
 * A due date the way the date picker stores it: local midnight serialised
 * to ISO. Built from local components so the tests hold in any timezone.
 */
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

function mockIssues(issues: IssueDTO[]) {
  return mockFetch().mockImplementation(async (input) => {
    if (String(input).startsWith(`${BASE}/issues`))
      return apiSuccess({ items: issues, nextCursor: null })
    return apiSuccess([])
  })
}

function renderCalendar() {
  return renderWithProviders(
    <IssueCalendarView
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      projectIdentifier='NEX'
    />,
  )
}

function getNavigation() {
  return {
    previous: screen.getByRole('button', { name: 'Mês anterior' }),
    today: screen.getByRole('button', { name: 'Hoje' }),
    next: screen.getByRole('button', { name: 'Próximo mês' }),
  }
}

beforeEach(() => {
  // Only Date is faked: timers stay real so Query and user-event still run.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 15, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('<IssueCalendarView /> month grid', () => {
  it('opens on the current month with a Monday-first week', async () => {
    mockIssues([])
    renderCalendar()

    expect(
      screen.getByRole('heading', { level: 2, name: 'março 2026' }),
    ).toBeInTheDocument()
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // March 2026 starts on a Sunday, so the grid is padded back to Mon 23 Feb
    // and forward to Sun 5 Apr: 6 full weeks.
    // Feb 22 (a Sunday) and Apr 6 fall outside it.
    expect(screen.getAllByText('23')).toHaveLength(2)
    expect(screen.getAllByText('22')).toHaveLength(1)
    expect(screen.getAllByText('5')).toHaveLength(2)
    expect(screen.getAllByText('6')).toHaveLength(1)
  })

  it('places each issue on its due day with its identifier', async () => {
    mockIssues([
      buildIssue({ number: 7, title: 'Login', dueDate: localDay(2026, 3, 10) }),
    ])
    renderCalendar()

    const chip = await screen.findByRole('button', { name: 'NEX-7 Login' })
    const cell = chip.closest('div.min-h-24') as HTMLElement
    expect(within(cell).getByText('10')).toBeInTheDocument()
  })

  it('also shows issues due on the padding days of adjacent months', async () => {
    mockIssues([
      buildIssue({ title: 'Fim de fevereiro', dueDate: localDay(2026, 2, 27) }),
    ])
    renderCalendar()

    expect(
      await screen.findByRole('button', { name: /Fim de fevereiro/ }),
    ).toBeInTheDocument()
  })

  it('caps a day at three issues and summarises the rest', async () => {
    const due = localDay(2026, 3, 20)
    mockIssues(
      ['Um', 'Dois', 'Três', 'Quatro', 'Cinco'].map((title, index) =>
        buildIssue({
          id: `i-${index}`,
          number: index + 1,
          title,
          dueDate: due,
        }),
      ),
    )
    renderCalendar()

    await screen.findByRole('button', { name: 'NEX-1 Um' })
    expect(
      screen.getByRole('button', { name: 'NEX-3 Três' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'NEX-4 Quatro' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('+2 mais')).toBeInTheDocument()
  })

  it('does not summarise a day holding exactly three issues', async () => {
    const due = localDay(2026, 3, 20)
    mockIssues(
      ['Um', 'Dois', 'Três'].map((title, index) =>
        buildIssue({
          id: `i-${index}`,
          number: index + 1,
          title,
          dueDate: due,
        }),
      ),
    )
    renderCalendar()

    await screen.findByRole('button', { name: 'NEX-3 Três' })
    expect(screen.queryByText(/mais$/)).not.toBeInTheDocument()
  })
})

describe('<IssueCalendarView /> undated issues', () => {
  it('lists issues without a due date in a "Sem prazo" tray', async () => {
    mockIssues([
      buildIssue({
        id: 'i-1',
        number: 1,
        title: 'Com prazo',
        dueDate: localDay(2026, 3, 2),
      }),
      buildIssue({ id: 'i-2', number: 2, title: 'Algum dia' }),
      buildIssue({ id: 'i-3', number: 3, title: 'Talvez' }),
    ])
    renderCalendar()

    const heading = await screen.findByRole('heading', { name: 'Sem prazo' })
    const tray = heading.parentElement?.parentElement as HTMLElement
    expect(within(tray).getByText('2')).toBeInTheDocument()
    expect(
      within(tray).getByRole('button', { name: 'NEX-2 Algum dia' }),
    ).toBeInTheDocument()
    expect(
      within(tray).getByRole('button', { name: 'NEX-3 Talvez' }),
    ).toBeInTheDocument()
    expect(within(tray).queryByText(/Com prazo/)).not.toBeInTheDocument()
  })

  it('hides the tray when every issue has a due date', async () => {
    mockIssues([buildIssue({ title: 'Login', dueDate: localDay(2026, 3, 2) })])
    renderCalendar()

    await screen.findByRole('button', { name: 'NEX-1 Login' })
    expect(
      screen.queryByRole('heading', { name: 'Sem prazo' }),
    ).not.toBeInTheDocument()
  })
})

describe('<IssueCalendarView /> navigation', () => {
  it('moves between months and jumps back to today', async () => {
    mockIssues([
      buildIssue({ title: 'Entrega de abril', dueDate: localDay(2026, 4, 22) }),
    ])
    const { user, queryClient } = renderCalendar()
    const { previous, today, next } = getNavigation()

    await waitFor(() =>
      expect(
        queryClient.getQueryState(issuesKey(WORKSPACE_ID, PROJECT_SLUG))
          ?.status,
      ).toBe('success'),
    )
    expect(screen.queryByText(/Entrega de abril/)).not.toBeInTheDocument()

    await user.click(next)
    expect(
      screen.getByRole('heading', { level: 2, name: 'abril 2026' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'NEX-1 Entrega de abril' }),
    ).toBeInTheDocument()

    await user.click(previous)
    await user.click(previous)
    expect(
      screen.getByRole('heading', { level: 2, name: 'fevereiro 2026' }),
    ).toBeInTheDocument()

    await user.click(today)
    expect(
      screen.getByRole('heading', { level: 2, name: 'março 2026' }),
    ).toBeInTheDocument()
  })

  it('opens the details panel of the clicked issue', async () => {
    mockIssues([
      buildIssue({ id: 'i-1', title: 'Login', dueDate: localDay(2026, 3, 3) }),
      buildIssue({ id: 'i-2', number: 2, title: 'Backlog solto' }),
    ])
    const { user } = renderCalendar()

    await user.click(
      await screen.findByRole('button', { name: 'NEX-2 Backlog solto' }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Detalhes da issue' }),
    ).toHaveTextContent('Backlog solto')
  })
})

describe('<IssueCalendarView /> timezones', () => {
  // Node re-reads TZ when it changes, so a viewer west of UTC is simulated
  // here whatever timezone the suite itself runs in.
  const originalTz = process.env.TZ
  beforeAll(() => {
    process.env.TZ = 'America/Sao_Paulo'
  })
  afterAll(() => {
    process.env.TZ = originalTz
  })

  function dayOfChip(name: string) {
    const chip = screen.getByRole('button', { name })
    const cell = chip.closest('div.min-h-24') as HTMLElement
    return cell.querySelector('span')?.textContent
  }

  it('shows a date stored as UTC midnight on that same day', async () => {
    mockIssues([
      buildIssue({ title: 'Entrega', dueDate: '2026-03-10T00:00:00.000Z' }),
    ])
    renderCalendar()

    await screen.findByRole('button', { name: 'NEX-1 Entrega' })
    expect(dayOfChip('NEX-1 Entrega')).toBe('10')
  })

  it('shows a date saved as local midnight east of UTC on its intended day', async () => {
    // 10 Mar picked in Tokyo (UTC+9) by the old picker: 9 Mar, 15:00 UTC.
    mockIssues([
      buildIssue({ title: 'De Tóquio', dueDate: '2026-03-09T15:00:00.000Z' }),
    ])
    renderCalendar()

    await screen.findByRole('button', { name: 'NEX-1 De Tóquio' })
    expect(dayOfChip('NEX-1 De Tóquio')).toBe('10')
  })
})
