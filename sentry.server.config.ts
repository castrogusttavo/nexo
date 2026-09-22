import * as Sentry from '@sentry/nextjs'
import { NEXT_PUBLIC_SENTRY_DSN } from '@/lib/env/env'
import { serverSentryOptions } from '@/lib/sentry/options'

// Imported by instrumentation.ts's `register()`, and only when a DSN is
// configured — the guard below is what makes the file safe to import anyway.

if (NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init(serverSentryOptions(NEXT_PUBLIC_SENTRY_DSN))
}
