import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { AccountLifecycleService } from '@/src/services/account-lifecycle.service'
import { handleError, successResponse } from '@/utils/http-response'

export const DELETE = withAxiom(async () => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const result = await AccountLifecycleService.cancelDeletion(
    auth.value.user.id,
  )

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
