'use client'

import type { PostHog, PostHogConfig } from 'posthog-js'
import { NEXT_PUBLIC_POSTHOG_HOST, NEXT_PUBLIC_POSTHOG_KEY } from '@/lib/env/env'
import { POSTHOG_PROXY_PATH } from './constants'

/**
 * Product analytics, loaded lazily and only behind consent.
 *
 * Two gates have to open before a single byte leaves the browser:
 *
 * 1. `NEXT_PUBLIC_POSTHOG_KEY` has to be set. Without it `loadPostHog()`
 *    resolves to `null` and the `posthog-js` chunk -- which is a lazy chunk,
 *    listed in no build manifest -- is never even fetched. Dev, CI and the
 *    test suites therefore need no PostHog credentials. (The default host in
 *    `./constants` is still a string in the eager bundle, because
 *    `lib/env/env.ts` defaults it; nothing reads it without a key.)
 * 2. The visitor has to have accepted analytics cookies. That gate lives in
 *    `app/_components/user/cookie-consent/consented-trackers.tsx`, which is
 *    the only caller: an undecided or rejecting visitor never renders the
 *    component that calls this module.
 *
 * What it is allowed to collect is deliberately narrow: page views, page
 * leaves, and events the code asks for by name. No autocapture, no heatmaps,
 * no dead clicks, no session recording, no surveys, no exception capture
 * (Sentry owns errors) and no web vitals (Axiom owns those). The only
 * identifier ever sent is the user id -- the same value `auditMutation` writes
 * as `actorId`, and for the same reason: it is the one field that lets us
 * answer a question without storing a name or an e-mail.
 */

export const POSTHOG_OPTIONS: Partial<PostHogConfig> = {
  // Same-origin: next.config.ts rewrites /ingest/* to the configured host.
  api_host: POSTHOG_PROXY_PATH,
  // Only used to build links back to the PostHog app (toolbar, debug), never
  // requested from the browser.
  ui_host: NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-08-30',

  // --- what we capture -----------------------------------------------------
  capture_pageview: 'history_change',
  capture_pageleave: true,
  autocapture: false,
  rageclick: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_performance: false,
  // Sentry is the error tracker; two copies of every exception in two tools
  // is two tools nobody trusts.
  capture_exceptions: false,

  // --- what we refuse to collect -------------------------------------------
  disable_session_recording: true,
  disable_surveys: true,
  disable_web_experiments: true,
  // Our CSP is `script-src 'self'`: PostHog may not inject remote <script>
  // tags, and with recording/surveys/experiments off it has no reason to.
  disable_external_dependency_loading: true,
  // Belt and braces for the capture paths that read the DOM.
  mask_all_text: true,
  mask_all_element_attributes: true,
  mask_personal_data_properties: true,
  // No profile for a visitor who never signs in.
  person_profiles: 'identified_only',
  respect_dnt: true,
  // We do not use PostHog feature flags; skipping the /flags/ round trip
  // keeps the reverse proxy to event ingestion only.
  advanced_disable_flags: true,
  property_denylist: ['$ip', '$initial_referrer', '$initial_referring_domain'],

  persistence: 'localStorage+cookie',
  secure_cookie: true,
}

let pending: Promise<PostHog | null> | null = null

/**
 * Resolves the initialised client, importing `posthog-js` on first call.
 * Repeated calls share one promise, so the SDK is fetched and initialised at
 * most once per page load. A failed import resolves to `null` rather than
 * rejecting: analytics must never break the app.
 */
export function loadPostHog(): Promise<PostHog | null> {
  const key = NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return Promise.resolve(null)
  pending ??= import('posthog-js')
    .then(({ posthog }) => {
      posthog.init(key, POSTHOG_OPTIONS)
      return posthog
    })
    .catch(() => null)
  return pending
}

/** Test seam: drops the memoised client so each case starts from nothing. */
export function resetPostHogForTests(): void {
  pending = null
}
