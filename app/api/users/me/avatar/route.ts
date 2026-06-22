import type { NextRequest } from 'next/server'
import { auditMutation } from '@/lib/axiom/audit'
import { withAxiom } from '@/lib/axiom/server'
import { MINIO_ENDPOINT } from '@/lib/env/_server'
import { UserCache } from '@/src/cache/user.cache'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
import { ensurePublicBucket, putObject } from '@/src/lib/storage/s3'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

const AVATAR_BUCKET = 'avatars'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const POST = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return standardError('VALIDATION_ERROR', 'Corpo da requisição inválido')
  }

  const file = formData.get('avatars')
  if (!file || !(file instanceof File))
    return standardError('VALIDATION_ERROR', 'Arquivo inválido')

  const ext = ALLOWED_TYPES[file.type]
  if (!ext)
    return standardError(
      'VALIDATION_ERROR',
      'Formato não suportado. Use JPEG, PNG ou WebP',
    )

  if (file.size > MAX_BYTES)
    return standardError(
      'VALIDATION_ERROR',
      'Arquivo muito grande. Máximo 5 MB',
    )

  const userId = auth.value.user.id
  const key = `users/${userId}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await ensurePublicBucket(AVATAR_BUCKET)
  await putObject({
    bucket: AVATAR_BUCKET,
    key,
    body: buffer,
    contentType: file.type,
  })

  const url = `${MINIO_ENDPOINT}/${AVATAR_BUCKET}/${key}`

  await prisma.user.update({
    where: { id: userId },
    data: { image: url },
  })
  await UserCache.invalidate(userId)

  auditMutation({
    entity: 'user',
    action: 'update',
    actorId: userId,
    targetId: userId,
    meta: { fields: ['image'] },
  })

  return successResponse({ url })
})
