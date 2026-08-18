import { logger } from '@/lib/axiom/logger'
import { storageError } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { ensureBucket, putObject } from '../lib/storage/s3'

export const ISSUE_EMBED_THUMBNAILS_BUCKET = 'issue-embed-thumbnails'

interface PersistEmbedThumbnailInput {
  key: string
  body: Buffer
  contentType: string
}

export async function persistEmbedThumbnail({
  key,
  body,
  contentType,
}: PersistEmbedThumbnailInput): Promise<Result<void>> {
  try {
    await ensureBucket(ISSUE_EMBED_THUMBNAILS_BUCKET)
    await putObject({
      bucket: ISSUE_EMBED_THUMBNAILS_BUCKET,
      key,
      body,
      contentType,
    })
    return ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('issue_embed_thumbnail.persist_failed', {
      component: 'EmbedThumbnailService',
      key,
      message,
    })
    return err(storageError('Falha ao armazenar a miniatura'))
  }
}
