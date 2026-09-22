import {
  NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_RELEASE,
  NODE_ENV,
} from '@/lib/env/env'
import { scrubBreadcrumb, scrubEvent } from './scrub'

/**
 * The `Sentry.init` options every runtime shares.
 *
 * Division of labour with Axiom, so the two do not report the same thing
 * twice and make both useless:
 *
 * - **Axiom** is the log of what happened: one line per request
 *   (`withAxiom`), the audit trail (`auditMutation` / `auditAuth`), web
 *   vitals, and the `logger.error` calls services make for failures they
 *   *handled* -- a rate limit hit, a Slack webhook that timed out, a Prisma
 *   error already mapped to an `AppError`. Those are expected outcomes with a
 *   response attached; they are queried, not alerted on.
 * - **Sentry** is the inbox of what broke: exceptions nobody caught. They
 *   reach it through Next's `onRequestError` (render/route/action crashes)
 *   and the browser's global error handlers -- never through a `logger.error`
 *   call. Because services return `Result` instead of throwing, an `AppError`
 *   mapped by `handleError` never becomes a Sentry issue, which is exactly
 *   the point: Sentry's issue list stays a list of bugs.
 *
 * Tracing samples 10% in production and is off everywhere else. Request
 * timing and web vitals already live in
 * Axiom, and paying for a second copy of it buys nothing.
 */
function baseOptions(dsn: string) {
  return {
    dsn,
    environment: NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? NODE_ENV,
    release: NEXT_PUBLIC_SENTRY_RELEASE,
    // No IP address, no cookies, no request body, no user agent inference.
    sendDefaultPii: false,
    // 10% is enough for the trend the Next.js/Queries/Web Vitals dashboards
    // draw without spending the quota on a product still in beta -- and
    // without it those dashboards stay empty forever, which reads as broken.
    // Errors are captured regardless of this rate.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    // The SDK's own console chatter would land in Axiom as noise.
    debug: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    ignoreErrors: [
      // App Router control flow, not failures.
      'NEXT_REDIRECT',
      'NEXT_NOT_FOUND',
      'NEXT_HTTP_ERROR_FALLBACK',
      // A navigation away mid-request; nothing to fix.
      'AbortError',
      'The operation was aborted',
    ],
  }
}

/** Browser runtime. Session Replay stays off: it records the DOM. */
export function clientSentryOptions(dsn: string) {
  return {
    ...baseOptions(dsn),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Breadcrumbs are kept, but the ones that carry request bodies are not.
    sendClientReports: false,
  }
}

/** Node runtime (route handlers, server components, server actions). */
export function serverSentryOptions(dsn: string) {
  return baseOptions(dsn)
}

/** Edge runtime (proxy.ts and anything else Next runs on the edge). */
export function edgeSentryOptions(dsn: string) {
  return baseOptions(dsn)
}
