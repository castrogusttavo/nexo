import {
  AxiomJSTransport,
  ConsoleTransport,
  Logger,
  type Transport,
} from '@axiomhq/logging'
import axiomClient from '@/lib/axiom/axiom'
import { NEXT_PUBLIC_AXIOM_DATASET } from '@/lib/env/env'
import { withTraceContext } from '@/lib/otel/trace-context'

const transports: [Transport, ...Transport[]] = [
  new AxiomJSTransport({
    axiom: axiomClient,
    dataset: NEXT_PUBLIC_AXIOM_DATASET,
  }),
]

if (process.env.NODE_ENV !== 'production') {
  transports.push(new ConsoleTransport({ prettyPrint: true }))
}

export const logger = new Logger({
  transports,
  // Every line carries the trace it was written in, so a slow request found in
  // the traces dataset opens straight onto its logs and the other way around.
  formatters: [withTraceContext],
})
