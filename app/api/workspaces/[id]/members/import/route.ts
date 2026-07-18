import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { parseMemberImportCsv } from '@/src/lib/csv/member-import-parser'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { MemberService } from '@/src/services/member.service'
import { readUploadFile } from '@/utils/form-data'
import { handleError, successResponse } from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id } = await ctx.params

  const file = await readUploadFile(request, 'file', {
    invalidBody: 'Formulário inválido',
    invalidFile: 'Arquivo CSV não enviado',
  })
  if (!file.ok) return handleError(file.error)

  const parsed = await parseMemberImportCsv(file.value)
  if (!parsed.ok) return handleError(parsed.error)

  const result = await MemberService.import(
    auth.value.user.id,
    id,
    parsed.value,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
