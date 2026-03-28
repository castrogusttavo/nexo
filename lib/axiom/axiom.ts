import { Axiom } from '@axiomhq/js';
import { NEXT_PUBLIC_AXIOM_TOKEN } from '@/lib/env/env.d';

const axiomClient = new Axiom({
  token: NEXT_PUBLIC_AXIOM_TOKEN,
});

export default axiomClient;
