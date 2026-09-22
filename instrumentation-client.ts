import { NEXT_PUBLIC_SENTRY_DSN } from '@/lib/env/env'
import { clientSentryOptions } from '@/lib/sentry/options'

/**
 * Browser-side error tracking.
 *
 * The SDK is imported dynamically so that a deployment without
 * `NEXT_PUBLIC_SENTRY_DSN` ships none of it: the chunk is never requested, no
 * ingest host appears in the bundle and nothing is sent. Next does not await
 * work started here (see the `instrumentation-client` docs), so the first few
 * milliseconds after hydration are not covered — a fair trade against sending
 * the whole SDK to every visitor of a deployment that has no DSN.
 *
 * PostHog is *not* initialised here: product analytics is consent-gated and
 * loads from `<ConsentedTrackers />` instead. Error tracking carries no
 * analytics identity, so it is gated on configuration, not on consent.
 */

type SentryModule = typeof import('@sentry/nextjs')

let sentry: SentryModule | null = null

const dsn = NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  void import('@sentry/nextjs')
    .then((module) => {
      module.init(clientSentryOptions(dsn))
      sentry = module
    })
    .catch(() => {
      // Error tracking that breaks the app it watches is worse than none.
    })
}

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
): void {
  sentry?.captureRouterTransitionStart(url, navigationType)
}
