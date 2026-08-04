import { logger } from '@/lib/axiom/logger'
import { storageError, validationError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { deleteObject, ensureBucket, putObject } from '@/src/lib/storage/s3'

export const ISSUE_ATTACHMENTS_BUCKET = 'issue-attachments'

const MAX_BYTES = 25 * 1024 * 1024 // 25MB

const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/csv',
])

export function validateAttachment(
  contentType: string,
  bytes: Buffer,
): Result<void> {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return err(validationError('Tipo de arquivo não permitido'))
  }
  if (bytes.byteLength === 0) {
    return err(validationError('Arquivo vazio'))
  }
  if (bytes.byteLength > MAX_BYTES) {
    return err(validationError('Arquivo muito grande. Máximo 25MB'))
  }

  return ok(undefined)
}

interface PersistAttachmentInput {
  key: string
  body: Buffer
  contentType: string
}

export async function persistAttachment({
  key,
  body,
  contentType,
}: PersistAttachmentInput): Promise<Result<void>> {
  try {
    await ensureBucket(ISSUE_ATTACHMENTS_BUCKET)
    await putObject({
      bucket: ISSUE_ATTACHMENTS_BUCKET,
      key,
      body,
      contentType,
    })
    return ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('issue_attachment.persist_failed', {
      component: 'AttachmentService',
      key,
      message,
    })
    return err(storageError('Falha ao armazenar o anexo'))
  }
}

export async function removeAttachmentObject(
  bucket: string,
  key: string,
): Promise<void> {
  try {
    await deleteObject({ bucket, key })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('issue_attachment.delete_failed', {
      component: 'AttachmentService',
      key,
      message,
    })
  }
}
