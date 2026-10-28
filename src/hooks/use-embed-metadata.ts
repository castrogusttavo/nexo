import { useMutation } from '@tanstack/react-query'
import type { EmbedMatch } from '@/lib/embed-providers'
import { apiFetchJson } from './_fetch'

interface EmbedMetadata extends EmbedMatch {
  thumbnailKey: string | null
}

export function useResolveEmbed(workspaceId: string, projectSlug: string) {
  // A lookup sent as POST: it reads metadata and changes no cached data.
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  return useMutation({
    mutationFn: (url: string) =>
      apiFetchJson<EmbedMetadata>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/embed-metadata`,
        'POST',
        { url },
        'Erro ao resolver embed',
      ),
  })
}
