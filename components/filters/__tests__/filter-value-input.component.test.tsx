import { screen, within } from '@testing-library/react'
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
import type {
  BasicFilterValue,
  BasicOperator,
  FilterField,
} from '../filter-schema'
import { FilterValueInput } from '../filter-value-input'

// Node re-reads TZ when it changes, so a viewer west of UTC is simulated
// here whatever timezone the suite itself runs in.
const originalTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/Sao_Paulo'
})
afterAll(() => {
  process.env.TZ = originalTz
})

beforeEach(() => {
  // Only Date is faked: timers stay real so user-event still runs.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 10, 12))
  mockFetch().mockImplementation(async () => apiSuccess([]))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderField(
  field: FilterField,
  operator: BasicOperator,
  value: BasicFilterValue,
) {
  const onChange = vi.fn()
  const result = renderWithProviders(
    <FilterValueInput
      workspaceId='ws-1'
      projectSlug='nexo'
      field={field}
      operator={operator}
      value={value}
      onChange={onChange}
    />,
  )
  return { ...result, onChange }
}

function renderInput(operator: BasicOperator, value: BasicFilterValue) {
  return renderField('due-date', operator, value)
}

describe('<FilterValueInput /> dates', () => {
  it('stores the picked day as UTC midnight of that day', async () => {
    const { user, onChange } = renderInput('before', null)

    await user.click(screen.getByRole('button', { name: 'Selecionar data' }))
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange).toHaveBeenLastCalledWith('2026-09-20T00:00:00.000Z')
  })

  it('labels a stored day with that same calendar day', () => {
    renderInput('before', '2026-09-20T00:00:00.000Z')

    expect(
      screen.getByRole('button', { name: '20/09/2026' }),
    ).toBeInTheDocument()
  })

  it('stores a picked range as UTC midnights', async () => {
    const { user, onChange } = renderInput('between', null)

    await user.click(screen.getByRole('button', { name: 'Selecionar período' }))
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange.mock.lastCall?.[0][0]).toBe('2026-09-20T00:00:00.000Z')
  })

  it('labels a stored range with its calendar days', () => {
    renderInput('between', [
      '2026-09-18T00:00:00.000Z',
      '2026-09-20T00:00:00.000Z',
    ])

    expect(
      screen.getByRole('button', { name: '18/09/2026 - 20/09/2026' }),
    ).toBeInTheDocument()
  })

  it('clears the stored day when the picked one is unselected', async () => {
    const { user, onChange } = renderInput('before', '2026-09-20T00:00:00.000Z')

    await user.click(screen.getByRole('button', { name: '20/09/2026' }))
    // Clicking the selected day again toggles it off.
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('<FilterValueInput /> shapes', () => {
  it('renders nothing when the operator takes no value', () => {
    const { container } = renderField('description', 'is-empty', null)

    expect(container).toBeEmptyDOMElement()
  })

  it('edits a text field as free text', async () => {
    const { user, onChange } = renderField('title', 'contains', '')

    const input = screen.getByPlaceholderText('Valor')
    expect(input).toHaveValue('')
    await user.type(input, 'a')

    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('shows an empty text field when the stored value is not a string', () => {
    renderField('title', 'contains', ['a', 'b'])

    expect(screen.getByPlaceholderText('Valor')).toHaveValue('')
  })
})

describe('<FilterValueInput /> option sources', () => {
  const SOURCES = {
    '/states': [{ id: 'state-1', name: 'A fazer' }],
    '/issue-types': [{ id: 'type-1', name: 'Bug' }],
    '/labels': [{ id: 'label-1', name: 'Urgente' }],
    '/cycles': [{ id: 'cycle-1', name: 'Sprint 1' }],
    '/modules': [{ id: 'module-1', name: 'Faturamento' }],
    '/members': [{ userId: 'user-1', name: 'Ana' }],
  }

  beforeEach(() => {
    mockFetch().mockImplementation(async (input) => {
      const url = String(input)
      // `/issues` also matches the project route prefix of the others, so it
      // is checked last and only when nothing more specific matched.
      for (const [route, items] of Object.entries(SOURCES)) {
        if (url.includes(route)) return apiSuccess(items)
      }
      if (url.includes('/issues'))
        return apiSuccess({
          items: [{ id: 'issue-1', title: 'Corrigir login' }],
          nextCursor: null,
        })
      return apiSuccess([])
    })
  })

  async function openOptions(user: ReturnType<typeof renderField>['user']) {
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))
    return within(await screen.findByRole('listbox'))
  }

  const cases: Array<[FilterField, string]> = [
    ['state', 'A fazer'],
    ['type', 'Bug'],
    ['labels', 'Urgente'],
    ['cycle', 'Sprint 1'],
    ['module', 'Faturamento'],
    ['assignees', 'Ana'],
    ['mentions', 'Ana'],
    ['created-by', 'Ana'],
    ['sub-issues', 'Corrigir login'],
    ['priority', 'Sem prioridade'],
    ['state-group', 'Em andamento'],
  ]

  it.each(cases)('offers the %s options', async (field, label) => {
    const { user } = renderField(field, 'is', [])

    const list = await openOptions(user)

    expect(await list.findByRole('option', { name: label })).toBeInTheDocument()
  })

  it('stores the option id, not its label', async () => {
    const { user, onChange } = renderField('state', 'is', [])

    const list = await openOptions(user)
    await user.click(await list.findByRole('option', { name: 'A fazer' }))

    expect(onChange).toHaveBeenCalledWith(['state-1'])
  })

  it('maps a member option to its user id', async () => {
    const { user, onChange } = renderField('assignees', 'is-not', [])

    const list = await openOptions(user)
    await user.click(await list.findByRole('option', { name: 'Ana' }))

    expect(onChange).toHaveBeenCalledWith(['user-1'])
  })

  it('drops an already selected option', async () => {
    const { user, onChange } = renderField('state', 'is', ['state-1'])

    // Once the options land, a single selection labels the trigger with it.
    await user.click(await screen.findByRole('button', { name: 'A fazer' }))
    const list = within(await screen.findByRole('listbox'))
    await user.click(list.getByRole('option', { name: 'A fazer' }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('treats a non-array value as an empty multi selection', () => {
    renderField('state', 'is', 'state-1')

    expect(
      screen.getByRole('button', { name: 'Selecionar' }),
    ).toBeInTheDocument()
  })

  // `operatorsFor` never pairs a relation field with a single-value operator
  // today, but the input still has to handle one when a clause says so.
  it('falls back to a single-value select for other operators', async () => {
    const { user, onChange } = renderField('priority', 'contains', 'LOW')

    await user.click(screen.getByRole('button', { name: 'Baixa' }))
    const list = within(await screen.findByRole('listbox'))
    await user.click(list.getByRole('option', { name: 'Alta' }))

    expect(onChange).toHaveBeenCalledWith('HIGH')
  })
})
