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

// The trigger formats with `toLocaleDateString('pt-BR')`, which is timezone
// dependent — pin the zone so the assertion holds wherever the suite runs.
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

  it('shows the stored date formatted for pt-BR', () => {
    renderWithProviders(
      <DatePicker
        label='Data de início'
        value='2026-09-20T12:00:00.000Z'
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: '20/09/2026' }),
    ).toBeInTheDocument()
  })

  it('reports the picked day as an ISO string', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <DatePicker label='Data de início' value={null} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Data de início' }))
    await user.click(
      await screen.findByRole('button', { name: /September 20/i }),
    )

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Date(2026, 8, 20).toISOString(),
    )
  })

  it('clears the date when the selected day is picked again', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <DatePicker
        label='Data de início'
        value={new Date(2026, 8, 20).toISOString()}
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
