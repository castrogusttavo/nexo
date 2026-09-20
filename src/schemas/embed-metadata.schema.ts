import { z } from 'zod'

// The route used to hand-check `typeof body.url !== 'string'`, which let any
// string through to the provider matcher. The matcher is the real gate (https
// only, host allowlist), but the contract should be stated here like every
// other endpoint's, so the documented EmbedMetadataInput has something to
// hold it to.
export const EmbedMetadataSchema = z.object({
  url: z
    .url('Informe uma URL válida')
    .startsWith('https://', 'A URL precisa usar https')
    .max(2048, 'URL muito longa'),
})

export type EmbedMetadataDTO = z.infer<typeof EmbedMetadataSchema>
