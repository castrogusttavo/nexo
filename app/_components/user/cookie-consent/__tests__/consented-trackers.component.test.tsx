import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CookieConsent } from '@/lib/cookie-consent/types'
import { ConsentedTrackers } from '../consented-trackers'
import { CookieConsentProvider } from '../provider'

// Stub the three analytics integrations with marker nodes. The real
// modules pull in browser-only telemetry; here we only care *whether*
// they get rendered, which is exactly what the consent gate decides.
vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid='vercel-analytics' />,
}))
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid='vercel-speed-insights' />,
}))
vi.mock('@/lib/axiom/client', () => ({
  WebVitals: () => <div data-testid='axiom-web-vitals' />,
}))

const TRACKER_TESTIDS = [
  'vercel-analytics',
  'vercel-speed-insights',
  'axiom-web-vitals',
] as const

function renderWithConsent(initial: CookieConsent) {
  return render(
    <CookieConsentProvider initial={initial} isAuthenticated={false}>
      <ConsentedTrackers />
    </CookieConsentProvider>,
  )
}

describe('<ConsentedTrackers /> consent gate', () => {
  it('mounts all trackers when consent is accepted', () => {
    renderWithConsent('accepted')
    for (const testId of TRACKER_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeTruthy()
    }
  })

  it('mounts no tracker when consent is rejected', () => {
    renderWithConsent('rejected')
    for (const testId of TRACKER_TESTIDS) {
      expect(screen.queryByTestId(testId)).toBeNull()
    }
  })

  it('mounts no tracker when the decision is still pending (null)', () => {
    renderWithConsent(null)
    for (const testId of TRACKER_TESTIDS) {
      expect(screen.queryByTestId(testId)).toBeNull()
    }
  })
})
