import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { MINIO_ENDPOINT } from '@/lib/env/_server'
import { UserCache } from '@/src/cache/user.cache'
import { storageError, validationError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { ensurePublicBucket, putObject } from '@/src/lib/storage/s3'
import { UserRepository } from '@/src/repositories/user.repository'

const AVATAR_BUCKET = 'avatars'
const COVER_BUCKET = 'user-covers'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface UserMediaUploadInput {
  userId: string
  contentType: string
  byteSize: number
  // Lazily read so MIME/size are validated the file is buffered.
  readBody: () => Promise<Buffer>
}

function validate(contentType: string, byteSize: number): Result<string> {
  const ext = ALLOWED_TYPES[contentType]
  if (!ext)
    return err(validationError('Formato não suportado. Use JPEG, PNG ou WebP'))
  if (byteSize > MAX_BYTES)
    return err(validationError('Arquivo muito grande. Máximo 5 MB'))
  return ok(ext)
}

async function persist(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<Result<string>> {
  try {
    await ensurePublicBucket(bucket)
    await putObject({ bucket, key, body, contentType })
    return ok(`${MINIO_ENDPOINT}/${bucket}/${key}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('user_media.persist_failed', {
      component: 'UserMediaService',
      bucket,
      key,
      message,
    })
    return err(storageError('Falha ao armazenar o arquivo'))
  }
}

async function upload(
  input: UserMediaUploadInput,
  config: {
    bucket: string
    filename: 'avatar' | 'cover'
    field: 'image' | 'coverImage'
  },
): Promise<Result<{ url: string }>> {
  const validation = validate(input.contentType, input.byteSize)
  if (!validation.ok) return validation
  const ext = validation.value

  const body = await input.readBody()
  const key = `users/${input.userId}/${config.filename}.${ext}`

  const stored = await persist(config.bucket, key, body, input.contentType)
  if (!stored.ok) return stored

  const updated = await UserRepository.update(input.userId, {
    [config.field]: stored.value,
  })
  if (!updated.ok) {
    auditMutation({
      entity: 'user',
      action: 'update',
      actorId: input.userId,
      targetId: input.userId,
      outcome: 'failure',
      reason: updated.error.code,
      meta: { fields: [config.field] },
    })

    return updated
  }

  await UserCache.invalidate(input.userId)

  auditMutation({
    entity: 'user',
    action: 'update',
    actorId: input.userId,
    targetId: input.userId,
    meta: { fields: [config.field] },
  })

  return ok({ url: stored.value })
}

export const UserMediaService = {
  uploadAvatar(input: UserMediaUploadInput): Promise<Result<{ url: string }>> {
    return upload(input, {
      bucket: AVATAR_BUCKET,
      filename: 'avatar',
      field: 'image',
    })
  },

  uploadCover(input: UserMediaUploadInput): Promise<Result<{ url: string }>> {
    return upload(input, {
      bucket: COVER_BUCKET,
      filename: 'cover',
      field: 'coverImage',
    })
  },
}
