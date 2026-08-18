import { createHash } from 'node:crypto'
import type { EmbedProvider } from '@/lib/embed-providers'
import { ok, type Result } from '@/src/lib/result'
import { getObjectBuffer } from '@/src/lib/storage/s3'
import {
  ISSUE_EMBED_THUMBNAILS_BUCKET,
  persistEmbedThumbnail,
} from './_embed-thumbnail'

async function fetchYoutubeThumbnail(
  sourceUrl: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`
  const response = await fetch(oembedUrl)
  if (!response.ok) return null

  const data = (await response.json()) as { thumbnail_url?: string }
  if (!data.thumbnail_url) return null

  const imageResponse = await fetch(data.thumbnail_url)
  if (!imageResponse.ok) return null

  return {
    buffer: Buffer.from(await imageResponse.arrayBuffer()),
    contentType: imageResponse.headers.get('content-type') ?? 'image/jpeg',
  }
}

// Figma/Loom/Google Docs/Sheets não têm oEmbed público simples — sem
// thumbnail cacheada, o card cai no fallback de ícone do provedor.
const THUMBNAIL_FETCHERS: Partial<
  Record<
    EmbedProvider,
    (url: string) => Promise<{ buffer: Buffer; contentType: string } | null>
  >
> = {
  youtube: fetchYoutubeThumbnail,
}

function keyFor(sourceUrl: string): string {
  return createHash('sha256').update(sourceUrl).digest('hex')
}

export const EmbedThumbnailService = {
  async getOrFetch(
    provider: EmbedProvider,
    sourceUrl: string,
  ): Promise<Result<{ key: string } | null>> {
    const key = keyFor(sourceUrl)

    const existing = await getObjectBuffer({
      bucket: ISSUE_EMBED_THUMBNAILS_BUCKET,
      key,
    })
    if (existing) return ok({ key })

    const fetcher = THUMBNAIL_FETCHERS[provider]
    if (!fetcher) return ok(null)

    const thumbnail = await fetcher(sourceUrl)
    if (!thumbnail) return ok(null)

    const persisted = await persistEmbedThumbnail({
      key,
      ...thumbnail,
      body: thumbnail.buffer,
    })
    if (!persisted.ok) return persisted

    return ok({ key })
  },
}
