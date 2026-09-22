import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CookieConsent } from '@/lib/cookie-consent/types'
import { ConsentedTrackers } from '../consented-trackers'
import { CookieConsentProvider } from '../provider'

// Stub the analytics integrations with marker nodes. The real modules pull in
// browser-only telemetry; here we only care *whether* they get rendered,
// which is exactly what the consent gate decides. The PostHog tracker renders
// null in production, so the stub also exposes the id it was handed.
vi.mock('@/lib/axiom/client', () => ({
  WebVitals: () => <div data-testid='axiom-web-vitals' />,
}))
vi.mock('../posthog-tracker', () => ({
  PostHogTracker: ({ userId }: { userId: string | null }) => (
    <div data-testid='posthog' data-user-id={userId ?? ''} />
  ),
}))

const TRACKER_TESTIDS = ['posthog', 'axiom-web-vitals'] as const

function renderWithConsent(
  initial: CookieConsent,
  userId: string | null = null,
) {
  return render(
    <CookieConsentProvider
      initial={initial}
      isAuthenticated={userId !== null}
      userId={userId}
    >
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

  it('hands PostHog the session user id and nothing else', () => {
    renderWithConsent('accepted', 'usr_123')
    expect(screen.getByTestId('posthog').dataset.userId).toBe('usr_123')
  })

  it('hands PostHog no id for an anonymous visitor', () => {
    renderWithConsent('accepted')
    expect(screen.getByTestId('posthog').dataset.userId).toBe('')
  })
})
