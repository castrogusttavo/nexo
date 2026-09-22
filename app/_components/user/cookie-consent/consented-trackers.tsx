'use client'

import { GoogleAnalytics } from '@next/third-parties/google'
import { WebVitals } from '@/lib/axiom/client'
import { NEXT_PUBLIC_GA_ID } from '@/lib/env/env'
import { PostHogTracker } from './posthog-tracker'
import { useCookieConsent } from './provider'

// Renders the analytics integrations (Axiom WebVitals, PostHog product
// analytics, Google Analytics) only when the user has explicitly accepted.
// Rejected or undecided keeps the DOM clean — none of these integrations
// loads its script, and PostHog's SDK chunk is not even fetched.
//
// Error tracking is deliberately not here: Sentry carries no analytics
// identity and is gated on `NEXT_PUBLIC_SENTRY_DSN`, not on consent.

export function ConsentedTrackers() {
  const { consent, userId } = useCookieConsent()
  if (consent !== 'accepted') return null
  return (
    <>
      <WebVitals />
      <PostHogTracker userId={userId} />
      {NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={NEXT_PUBLIC_GA_ID} />}
    </>
  )
}
