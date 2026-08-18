import { matchEmbedProvider } from '@/lib/embed-providers'
import { validationError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { resolveProject } from './_project-scope'
import { EmbedThumbnailService } from './embed-thumbnail.service'

interface EmbedMetadata {
  provider: string
  label: string
  embedUrl: string
  sourceUrl: string
  thumbnailKey: string | null
}

export const EmbedMetadataService = {
  async resolve(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    url: string,
  ): Promise<Result<EmbedMetadata>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const match = matchEmbedProvider(url)
    if (!match) return err(validationError('URL não suportada para embed'))

    const thumbnail = await EmbedThumbnailService.getOrFetch(
      match.provider,
      match.sourceUrl,
    )
    if (!thumbnail.ok) return thumbnail

    return ok({ ...match, thumbnailKey: thumbnail.value?.key ?? null })
  },
}
