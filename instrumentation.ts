import type { Instrumentation } from 'next'
import { NEXT_PUBLIC_SENTRY_DSN } from '@/lib/env/env'

/**
 * Server-side observability boot.
 *
 * Without `NEXT_PUBLIC_SENTRY_DSN` this file does nothing at all: the dynamic
 * imports below never run, so `@sentry/nextjs` is not even loaded into the
 * server bundle's module graph at runtime. CI and local development therefore
 * need no DSN, and a deployment without one pays no cost.
 *
 * Axiom is *not* booted here — it is a plain logger created per module
 * (`lib/axiom/logger.ts`) and wired into route handlers by `withAxiom`.
 */

export async function register(): Promise<void> {
  if (!NEXT_PUBLIC_SENTRY_DSN) return
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Next hands us every error it caught while rendering a page, running a route
 * handler, a server action or the proxy. These are the uncaught ones: a
 * service that returns `err(...)` never reaches here, because nothing threw.
 * That is the line between Sentry and Axiom — see `lib/sentry/options.ts`.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (!NEXT_PUBLIC_SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(error, request, context)
}
