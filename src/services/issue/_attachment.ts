import { logger } from '@/lib/axiom/logger'
import { storageError, validationError } from '@/src/errors'
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
} from '@/src/lib/attachment-limits'
import { err, ok, type Result } from '@/src/lib/result'
import { deleteObject, ensureBucket, putObject } from '@/src/lib/storage/s3'

export const ISSUE_ATTACHMENTS_BUCKET = 'issue-attachments'

export function validateAttachment(
  contentType: string,
  bytes: Buffer,
): Result<void> {
  if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
    return err(validationError('Tipo de arquivo não permitido'))
  }
  if (bytes.byteLength === 0) {
    return err(validationError('Arquivo vazio'))
  }
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    return err(validationError('Arquivo muito grande. Máximo 25MB'))
  }

  return ok(undefined)
}

interface PersistAttachmentInput {
  key: string
  body: Buffer
  contentType: string
  bucket?: string
}

export async function persistAttachment({
  key,
  body,
  contentType,
  bucket = ISSUE_ATTACHMENTS_BUCKET,
}: PersistAttachmentInput): Promise<Result<void>> {
  try {
    await ensureBucket(bucket)
    await putObject({
      bucket,
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
      bucket,
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
