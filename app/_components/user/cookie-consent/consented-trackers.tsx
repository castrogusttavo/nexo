'use client'

import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { WebVitals } from '@/lib/axiom/client'
import { NEXT_PUBLIC_GA_ID } from '@/lib/env/env'
import { useCookieConsent } from './provider'

// Renders the analytics integrations (Axiom WebVitals, Vercel Analytics,
// Vercel SpeedInsights, Google Analytics) only when the user has
// explicitly accepted. Rejected or undecided keeps the DOM clean — none
// of these integrations loads its script.

export function ConsentedTrackers() {
  const { consent } = useCookieConsent()
  if (consent !== 'accepted') return null
  return (
    <>
      <WebVitals />
      <Analytics />
      <SpeedInsights />
      {NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={NEXT_PUBLIC_GA_ID} />}
    </>
  )
}
