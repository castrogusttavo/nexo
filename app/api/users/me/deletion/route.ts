import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { handleError, successResponse } from '@/utils/http-response'

export const DELETE = withAxiom(async () => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const result = await UserService.cancelDeletion(auth.value.user.id)

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
