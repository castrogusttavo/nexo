import { logger } from '@/lib/axiom/logger'
import { storageError, validationError } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { ensureBucket, putObject } from '../lib/storage/s3'

export const WIKI_MEDIA_BUCKET = 'wiki-media'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200MB
const MAX_AUDIO_BYTES = 50 * 1024 * 1024 // 50MB
const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25MB

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])
const ALLOWED_VIDEO_CONTENT_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
])
const ALLOWED_AUDIO_CONTENT_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
])

function maxBytesFor(contentType: string): number {
  if (ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) return MAX_IMAGE_BYTES
  if (ALLOWED_VIDEO_CONTENT_TYPES.has(contentType)) return MAX_VIDEO_BYTES
  if (ALLOWED_AUDIO_CONTENT_TYPES.has(contentType)) return MAX_AUDIO_BYTES
  return MAX_FILE_BYTES
}

export function validateWikiMedia(
  contentType: string,
  bytes: Buffer,
): Result<void> {
  if (bytes.byteLength === 0) {
    return err(validationError('Arquivo vazio'))
  }

  const maxBytes = maxBytesFor(contentType)
  if (bytes.byteLength > maxBytes) {
    return err(
      validationError(
        `Arquivo muito grande. Máximo ${maxBytes / (1024 * 1024)}MB`,
      ),
    )
  }

  return ok(undefined)
}

interface PersistWikiMediaInput {
  key: string
  body: Buffer
  contentType: string
}

export async function persistWikiMedia({
  body,
  contentType,
  key,
}: PersistWikiMediaInput) {
  try {
    await ensureBucket(WIKI_MEDIA_BUCKET)
    await putObject({ bucket: WIKI_MEDIA_BUCKET, key, body, contentType })
    return ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('wiki_media.persist_failed', {
      component: 'WikiMediaService',
      key,
      message,
    })
    return err(storageError('Falha ao armazenar o arquivo'))
  }
}
