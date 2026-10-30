import { logger } from '@/lib/axiom/logger'
import { MINIO_ENDPOINT } from '@/lib/env/_server'
import { storageError, validationError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import {
  deleteObject,
  ensurePublicBucket,
  putObject,
} from '@/src/lib/storage/s3'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Validates MIME type + size, returning the file extension on success
export function validateImage(
  contentType: string,
  byteSize: number,
): Result<string> {
  const ext = ALLOWED_TYPES[contentType]
  if (!ext)
    return err(validationError('Formato não suportado. Use JPEG, PNG ou WebP'))
  if (byteSize > MAX_BYTES)
    return err(validationError('Arquivo muito grande. Máximo 5 MB'))

  return ok(ext)
}

interface PersistInput {
  bucket: string
  key: string
  body: Buffer
  contentType: string
  // Payload component for the failure log, e.g. `UserMediaService`
  component: string
  // Log event on failure, e.g. `user_media.persist_failed`
  event: string
}

// Uploads to a public bucket and return the public URL.
export async function persistObject({
  bucket,
  key,
  body,
  contentType,
  component,
  event,
}: PersistInput): Promise<Result<string>> {
  try {
    await ensurePublicBucket(bucket)
    await putObject({ bucket, key, body, contentType })
    return ok(`${MINIO_ENDPOINT}/${bucket}/${key}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(event, { component, bucket, key, message })

    return err(storageError('Falha ao armazena o arquivo'))
  }
}

// Best-effort removal of an object we stored: `url` is the public URL that
// `persistObject` returned. An orphaned file costs less than failing the
// request that already succeeded, so errors are swallowed.
export async function dropObject(
  bucket: string,
  url: string | null,
): Promise<void> {
  if (!url) return
  const marker = `/${bucket}/`
  const at = url.indexOf(marker)
  if (at === -1) return

  await deleteObject({ bucket, key: url.slice(at + marker.length) }).catch(
    () => undefined,
  )
}
