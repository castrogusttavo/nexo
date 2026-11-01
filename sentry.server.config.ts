import * as Sentry from '@sentry/nextjs'
import { NEXT_PUBLIC_SENTRY_DSN } from '@/lib/env/env'
import {
  AXIOM_TRACES_DATASET,
  AXIOM_TRACES_TOKEN,
  TRACES_SAMPLE_RATE,
} from '@/lib/env/server'
import { serverTracingOptions } from '@/lib/otel/axiom-traces'
import { serverSentryOptions } from '@/lib/sentry/options'

// Imported by instrumentation.ts's `register()`, and only when a DSN is
// configured — the guard below is what makes the file safe to import anyway.

if (NEXT_PUBLIC_SENTRY_DSN) {
  // The name the traces dashboard groups by; an operator's own value wins.
  process.env.OTEL_SERVICE_NAME ??= 'nexo-web'
  Sentry.init({
    ...serverSentryOptions(NEXT_PUBLIC_SENTRY_DSN),
    // Request traces go to Axiom; with no AXIOM_TRACES_TOKEN this adds nothing.
    ...serverTracingOptions({
      token: AXIOM_TRACES_TOKEN,
      dataset: AXIOM_TRACES_DATASET,
      sampleRate: TRACES_SAMPLE_RATE,
    }),
  })
}
