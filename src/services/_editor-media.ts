import { logger } from '@/lib/axiom/logger'
import { storageError, validationError } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { ensureBucket, putObject } from '../lib/storage/s3'

export const ISSUE_EDITOR_MEDIA_BUCKET = 'issue-editor-media'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200MB

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

export function validateEditorMedia(
  contentType: string,
  bytes: Buffer,
): Result<void> {
  const isImage = ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)
  const isVideo = ALLOWED_VIDEO_CONTENT_TYPES.has(contentType)

  if (!isImage && !isVideo) {
    return err(validationError('Tipo de arquivo não permitido'))
  }
  if (bytes.byteLength === 0) {
    return err(validationError('Arquivo vazio'))
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (bytes.byteLength > maxBytes) {
    return err(
      validationError(
        `Arquivo muito grande. Máximo ${maxBytes / (1024 * 1024)}MB`,
      ),
    )
  }

  return ok(undefined)
}

interface PersistEditorMediaInput {
  key: string
  body: Buffer
  contentType: string
}

export async function persistEditorMedia({
  body,
  contentType,
  key,
}: PersistEditorMediaInput): Promise<Result<void>> {
  try {
    await ensureBucket(ISSUE_EDITOR_MEDIA_BUCKET)
    await putObject({
      bucket: ISSUE_EDITOR_MEDIA_BUCKET,
      key,
      body,
      contentType,
    })
    return ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('issue_editor_media.persist_failed', {
      component: 'EditorMediaService',
      key,
      message,
    })
    return err(storageError('Falha ao armazenar o arquivo'))
  }
}
