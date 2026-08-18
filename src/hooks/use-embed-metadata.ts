import { useMutation } from '@tanstack/react-query'
import type { EmbedMatch } from '@/lib/embed-providers'
import { apiFetchJson } from './_fetch'

interface EmbedMetadata extends EmbedMatch {
  thumbnailKey: string | null
}

export function useResolveEmbed(workspaceId: string, projectSlug: string) {
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
