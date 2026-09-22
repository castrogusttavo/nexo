import * as Sentry from '@sentry/nextjs'
import { NEXT_PUBLIC_SENTRY_DSN } from '@/lib/env/env'
import { edgeSentryOptions } from '@/lib/sentry/options'

// The edge runtime is where proxy.ts runs: the auth gate, the CSP and the
// Axiom middleware log line. Imported by instrumentation.ts's `register()`
// only when a DSN is configured.

if (NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init(edgeSentryOptions(NEXT_PUBLIC_SENTRY_DSN))
}
