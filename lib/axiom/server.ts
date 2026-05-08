import { createAxiomRouteHandler } from '@axiomhq/nextjs'
import { logger } from '@/lib/axiom/logger'

export { logger }

export const withAxiom = createAxiomRouteHandler(logger)
