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
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { DateRangePicker } from '../date-range-picker'

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
})

afterEach(() => {
  vi.useRealTimers()
})

describe('<DateRangePicker />', () => {
  it('stores the picked day as UTC midnight of that day', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <DateRangePicker startDate={null} dueDate={null} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Datas' }))
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.lastCall?.[0].startDate).toBe(
      '2026-09-20T00:00:00.000Z',
    )
  })

  it('labels stored dates with their calendar day', () => {
    renderWithProviders(
      <DateRangePicker
        startDate='2026-09-20T00:00:00.000Z'
        dueDate='2026-09-22T00:00:00.000Z'
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: '20/09/2026 - 22/09/2026' }),
    ).toBeInTheDocument()
  })
})
