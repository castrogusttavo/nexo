'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { WebVitals } from '@/lib/axiom/client'
import { useCookieConsent } from './provider'

// Renders the three analytics integrations (Axiom WebVitals, Vercel
// Analytics, Vercel SpeedInsights) only when the user has explicitly
// accepted. Rejected or undecided keeps the DOM clean — none of these
// integrations loads its script.

export function ConsentedTrackers() {
  const { consent } = useCookieConsent()
  if (consent !== 'accepted') return null
  return (
    <>
      <WebVitals />
      <Analytics />
      <SpeedInsights />
    </>
  )
}
