import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { ok, type Result } from '@/src/lib/result'
import { UserRepository } from '@/src/repositories/user.repository'
import { persistObject, validateImage } from './_media'

const AVATAR_BUCKET = 'avatars'
const COVER_BUCKET = 'user-covers'

export interface UserMediaUploadInput {
  userId: string
  contentType: string
  byteSize: number
  // Lazily read so MIME/size are validated the file is buffered.
  readBody: () => Promise<Buffer>
}

async function upload(
  input: UserMediaUploadInput,
  config: {
    bucket: string
    filename: 'avatar' | 'cover'
    field: 'image' | 'coverImage'
  },
): Promise<Result<{ url: string }>> {
  const validation = validateImage(input.contentType, input.byteSize)
  if (!validation.ok) return validation
  const ext = validation.value

  const body = await input.readBody()
  const key = `users/${input.userId}/${config.filename}.${ext}`

  const stored = await persistObject({
    bucket: config.bucket,
    key,
    body,
    contentType: input.contentType,
    component: 'UserMediaService',
    event: 'user_media.persist_failed',
  })
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
