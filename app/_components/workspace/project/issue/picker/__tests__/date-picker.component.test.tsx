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
import { DatePicker } from '../date-picker'

// Issue dates are calendar days stored as UTC midnight. Running west of UTC
// (São Paulo) is where reading them as instants showed the day before.
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

describe('<DatePicker />', () => {
  it('shows the label while no date is stored', () => {
    renderWithProviders(
      <DatePicker label='Data de início' value={null} onChange={vi.fn()} />,
    )

    expect(
      screen.getByRole('button', { name: 'Data de início' }),
    ).toBeInTheDocument()
  })

  it('shows the stored day, not the day before, west of UTC', () => {
    renderWithProviders(
      <DatePicker
        label='Data de início'
        value='2026-09-20T00:00:00.000Z'
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: '20/09/2026' }),
    ).toBeInTheDocument()
  })

  it('reports the picked day as its UTC midnight', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <DatePicker label='Data de início' value={null} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Data de início' }))
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-09-20T00:00:00.000Z')
  })

  it('clears the date when the selected day is picked again', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <DatePicker
        label='Data de início'
        value='2026-09-20T00:00:00.000Z'
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '20/09/2026' }))
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange).toHaveBeenCalledExactlyOnceWith(null)
  })
})
