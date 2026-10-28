import { Axiom } from '@axiomhq/js';
// Public by design: browser logs ship straight to Axiom, so the client needs
// a token. It must be an ingest-only token scoped to this dataset; it can
// write events and read nothing.
// react-doctor-disable-next-line react-doctor/public-env-secret-name
import { NEXT_PUBLIC_AXIOM_TOKEN } from '@/lib/env/env';

const axiomClient = new Axiom({
  token: NEXT_PUBLIC_AXIOM_TOKEN,
});

export default axiomClient;
