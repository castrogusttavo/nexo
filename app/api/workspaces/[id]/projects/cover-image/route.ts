import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { MINIO_ENDPOINT } from '@/lib/env/_server'
import { forbidden } from '@/src/errors'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ensurePublicBucket, putObject } from '@/src/lib/storage/s3'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

const BUCKET = 'projects-covers'
const MAX_SIZE = 5 * 1024 * 1024

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id } = await ctx.params

  const membership = await MembershipRepository.findByUserAndWorkspace(
    auth.value.user.id,
    id,
  )
  if (!membership.ok) return handleError(membership.error)
  if (!membership.value) return handleError(forbidden())

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return standardError('VALIDATION_ERROR', 'Formulário inválido')
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return standardError('VALIDATION_ERROR', 'Arquivo não enviado')
  }

  if (!file.type.startsWith('image/')) {
    return standardError('VALIDATION_ERROR', 'Arquivo inválido')
  }

  if (file.size > MAX_SIZE) {
    return standardError('VALIDATION_ERROR', 'Arquivo muito grande (máx. 5 MB')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const key = `${id}/${crypto.randomUUID()}.${ext}`

  await ensurePublicBucket(BUCKET)
  const buffer = Buffer.from(await file.arrayBuffer())
  await putObject({ bucket: BUCKET, key, body: buffer, contentType: file.type })

  return successResponse({ url: `${MINIO_ENDPOINT}/${BUCKET}/${key}` }, 201)
})
