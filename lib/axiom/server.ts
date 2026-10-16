import { createAxiomRouteHandler, getLogLevelFromStatusCode, getNextErrorStatusCode, transformRouteHandlerErrorResult, transformRouteHandlerSuccessResult } from '@axiomhq/nextjs'
import { connection } from 'next/server'
import { logger } from '@/lib/axiom/logger'

export { logger }

// The library's default callbacks `await logger.flush()` inside after() on
// every request. @axiomhq/js serializes flushes and each on is a POST to
// Axiom (~400ms from here), so under load they queue faster than they drain
// and every pending flush keeps its whole request alive: locally, 8.7k
// request left 14k suspended flushes and 3.7k ServerResponse objects behind,
// and production died of heap exhaution on 2026-10-16. Logging without
// flushing leaves batching to the client (every is or 1000 events).
const withAxiomLogging = createAxiomRouteHandler(logger, {
  onSuccess: (data) => {
    logger.info(...transformRouteHandlerSuccessResult(data))
  },
  onError: (data) => {
    if (data.error instanceof Error) logger.error(data.error.message, data.error)
    const status = 
      data.error instanceof Error ? getNextErrorStatusCode(data.error) : 500
    logger.log(
      getLogLevelFromStatusCode(status),
      ...transformRouteHandlerErrorResult(data)
    )
  }
})


/**
 * Axiom request logging for route handlers, gated on a real request.
 *
 * Every handler wrapped here serves a request (session, rate limit by IP,
 * request logging), so none of them can be prerendered. With
 * `cacheComponents` Next still tries to prerender GET handlers at build time,
 * and the attempt aborts at the first `request.headers` read -- after the
 * wrapper already queued a log, whose batched flush then calls fetch() once
 * the prerender is over (`HANGING_PROMISE_REJECTION` in `next build`).
 * `connection()` is Next 16's documented way to say "request time only": it
 * never resolves during a prerender, so nothing below it runs at build time.
 * At request time it resolves immediately.
 */
export const withAxiom: typeof withAxiomLogging = (handler) => {
  const logged = withAxiomLogging(handler)
  return async (req, ctx) => {
    await connection()
    return logged(req, ctx)
  }
}