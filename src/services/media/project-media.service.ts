import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { MINIO_ENDPOINT } from '@/lib/env/_server'
import { forbidden, storageError, validationError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { ensurePublicBucket, putObject } from '@/src/lib/storage/s3'
import { MembershipRepository } from '@/src/repositories/membership.repository'

const BUCKET = 'projects-covers'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface ProjectCoverUploadInput {
  actorId: string
  workspaceId: string
  contentType: string
  byteSize: number
  // Lazily read so authz + MIME/size are validated before buffering
  readBody: () => Promise<Buffer>
}

export const ProjectMediaService = {
  async uploadCover(
    input: ProjectCoverUploadInput,
  ): Promise<Result<{ url: string }>> {
    const membership = await MembershipRepository.findByUserAndWorkspace(
      input.actorId,
      input.workspaceId,
    )
    if (!membership.ok) return membership
    if (!membership.value) return err(forbidden())

    const ext = ALLOWED_TYPES[input.contentType]
    if (!ext)
      return err(
        validationError('Formato não suportado. Use JPEG, PNG ou WebP'),
      )
    if (input.byteSize > MAX_BYTES)
      return err(validationError('Arquivo muito grande. Máximo 5 MB'))

    const key = `${input.workspaceId}/${crypto.randomUUID()}.${ext}`
    const body = await input.readBody()

    try {
      await ensurePublicBucket(BUCKET)
      await putObject({
        bucket: BUCKET,
        key,
        body,
        contentType: input.contentType,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('project_media.persist_failed', {
        component: 'ProjectMediaService',
        bucket: BUCKET,
        key,
        message,
      })
      return err(storageError('Falha ao armazenar o arquivo'))
    }

    const url = `${MINIO_ENDPOINT}/${BUCKET}/${key}`

    auditMutation({
      entity: 'storage_object',
      action: 'upload',
      actorId: input.actorId,
      meta: { bucket: BUCKET, key, workspaceId: input.workspaceId },
    })

    return ok({ url })
  },
}
