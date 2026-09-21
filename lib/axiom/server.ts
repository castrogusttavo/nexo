import { createAxiomRouteHandler } from '@axiomhq/nextjs'
import { connection } from 'next/server'
import { logger } from '@/lib/axiom/logger'

export { logger }

const withAxiomLogging = createAxiomRouteHandler(logger)

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
