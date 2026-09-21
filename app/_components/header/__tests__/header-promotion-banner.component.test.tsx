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
import { HeaderPromotionBanner } from '../header-promotion-banner'

// The countdown and the end-date label are both timezone sensitive.
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

function renderBanner(
  props: Partial<React.ComponentProps<typeof HeaderPromotionBanner>> = {},
) {
  return renderWithProviders(
    <HeaderPromotionBanner
      endDate={new Date(2026, 8, 17, 12).toISOString()}
      plan='PRO'
      slug='nexo'
      {...props}
    />,
  )
}

describe('<HeaderPromotionBanner />', () => {
  it('counts the days left and names the day the trial ends', () => {
    renderBanner()

    expect(
      screen.getByText(
        /Restam 7 dias do seu teste do plano Pro\. Depois de 17\/09, você volta ao plano Free\./,
      ),
    ).toBeInTheDocument()
  })

  it('uses the singular on the last day', () => {
    renderBanner({ endDate: new Date(2026, 8, 11, 12).toISOString() })

    expect(screen.getByText(/Restam 1 dia do seu teste/)).toBeInTheDocument()
  })

  it('never counts below zero once the trial has expired', () => {
    renderBanner({ endDate: new Date(2026, 8, 1, 12).toISOString() })

    expect(screen.getByText(/Restam 0 dias do seu teste/)).toBeInTheDocument()
  })

  it('names the plan being trialled', () => {
    renderBanner({ plan: 'BUSINESS' })

    expect(screen.getByText(/teste do plano Business/)).toBeInTheDocument()
  })

  // Both calls to action render as links exposed with `role="button"`.
  it('links straight to the yearly checkout of that plan', () => {
    renderBanner()

    expect(screen.getByRole('link', { name: 'Assinar Pro' })).toHaveAttribute(
      'href',
      '/upgrade?plan=PRO&billing=yearly',
    )
  })

  it('links to the billing settings of the current workspace', () => {
    renderBanner({ slug: 'atlas' })

    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute(
      'href',
      '/atlas/settings/billing',
    )
  })
})
