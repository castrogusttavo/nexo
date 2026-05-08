import { AxiomJSTransport, Logger } from '@axiomhq/logging'
import axiomClient from '@/lib/axiom/axiom'
import { NEXT_PUBLIC_AXIOM_DATASET } from '@/lib/env/env'

export const logger = new Logger({
  transports: [
    new AxiomJSTransport({
      axiom: axiomClient,
      dataset: NEXT_PUBLIC_AXIOM_DATASET,
    }),
  ],
})
