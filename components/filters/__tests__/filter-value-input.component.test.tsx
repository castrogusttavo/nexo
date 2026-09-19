import { screen } from '@testing-library/react'
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
import type { BasicFilterValue, BasicOperator } from '../filter-schema'
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

function renderInput(operator: BasicOperator, value: BasicFilterValue) {
  const onChange = vi.fn()
  const result = renderWithProviders(
    <FilterValueInput
      workspaceId='ws-1'
      projectSlug='nexo'
      field='due-date'
      operator={operator}
      value={value}
      onChange={onChange}
    />,
  )
  return { ...result, onChange }
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
})
