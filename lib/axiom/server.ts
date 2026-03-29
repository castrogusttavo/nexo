import axiomClient from '@/lib/axiom/axiom';
import { NEXT_PUBLIC_AXIOM_DATASET } from '@/lib/env/env/env';
import { Logger, AxiomJSTransport } from '@axiomhq/logging';
import { createAxiomRouteHandler, nextJsFormatters } from '@axiomhq/nextjs';

export const logger = new Logger({
  transports: [
    new AxiomJSTransport({ axiom: axiomClient, dataset: NEXT_PUBLIC_AXIOM_DATASET }),
  ],
  formatters: nextJsFormatters,
});

export const withAxiom = createAxiomRouteHandler(logger);
