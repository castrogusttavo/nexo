import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { HeaderTrialBanner } from '../header-trial-banner'

const NOW = new Date(2026, 8, 10, 12)
const inDays = (days: number) =>
  new Date(NOW.getTime() + days * 86_400_000).toISOString()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function renderBanner(endDate: string) {
  return renderWithProviders(
    <HeaderTrialBanner endDate={endDate} plan='PRO' slug='nexo' />,
  )
}

// The window is TRIAL_BANNER_DAYS (5): the banner is a nudge for the last
// days of the trial, not a countdown from day one.
describe('<HeaderTrialBanner />', () => {
  it('shows the banner during the last days of the trial', () => {
    renderBanner(inDays(3))

    expect(screen.getByText(/Restam 3 dias/)).toBeInTheDocument()
  })

  it('shows it on the first day of the window', () => {
    renderBanner(inDays(5))

    expect(screen.getByText(/Restam 5 dias/)).toBeInTheDocument()
  })

  it('stays hidden while the trial is further from its end', () => {
    const { container } = renderBanner(inDays(6))

    expect(container).toBeEmptyDOMElement()
  })

  it('stays hidden once the trial has ended', () => {
    const { container } = renderBanner(inDays(-1))

    expect(container).toBeEmptyDOMElement()
  })
})

describe('<HeaderTrialBanner /> on the server', () => {
  // The server's clock and UTC date differ from the viewer's, so the server
  // HTML holds nothing for the client to disagree with.
  it('renders nothing before hydration', async () => {
    const { renderToString } = await import('react-dom/server')

    const html = renderToString(
      <HeaderTrialBanner endDate={inDays(3)} plan='PRO' slug='nexo' />,
    )

    expect(html).toBe('')
  })
})
