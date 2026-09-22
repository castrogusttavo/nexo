'use client'

import { WebVitals } from '@/lib/axiom/client'
import { PostHogTracker } from './posthog-tracker'
import { useCookieConsent } from './provider'

// Renders the analytics integrations (Axiom WebVitals, PostHog product
// analytics) only when the user has explicitly accepted. Rejected or
// undecided keeps the DOM clean — none of these integrations loads its
// script, and PostHog's SDK chunk is not even fetched.
//
// Google Analytics used to be here too. It was removed with PostHog's
// arrival: its script is loaded from googletagmanager.com, which our
// `script-src 'self'` refuses, so every visit that accepted cookies produced
// a CSP violation and no data. Two analytics tools nobody reads is worse
// than one that works.
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
    </>
  )
}
