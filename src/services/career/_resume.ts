import { logger } from '@/lib/axiom/logger'
import { storageError, validationError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { ensureBucket, putObject } from '@/src/lib/storage/s3'

export const CAREER_APPLICATIONS_BUCKET = 'career-applications'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const PDF_MAGIC = Buffer.from('%PDF-')

export function validateResume(
  contentType: string,
  bytes: Buffer,
): Result<void> {
  if (contentType !== 'application/pdf') {
    return err(validationError('Envie o currículo em PDF'))
  }
  if (bytes.byteLength > MAX_BYTES) {
    return err(validationError('Arquivo muito grande. Máximo 10 MB'))
  }
  if (!bytes.subarray(0, 5).equals(PDF_MAGIC)) {
    return err(validationError('Arquivo não parece ser um PDF válido'))
  }

  return ok(undefined)
}

interface PersistResumeInput {
  key: string
  body: Buffer
}

export async function persistResume({
  key,
  body,
}: PersistResumeInput): Promise<Result<void>> {
  try {
    await ensureBucket(CAREER_APPLICATIONS_BUCKET)
    await putObject({
      bucket: CAREER_APPLICATIONS_BUCKET,
      key,
      body,
      contentType: 'application/pdf',
    })
    return ok(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('career_application.resume_persist_failed', {
      component: 'CareerApplicationService',
      key,
      message,
    })
    return err(storageError('Falha o armazenar o currículo'))
  }
}
